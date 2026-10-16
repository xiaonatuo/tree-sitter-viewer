import path from "path";
import * as vscode from "vscode";
import { Tree, Point, Node, TreeCursor, Parser, Language, Query } from "web-tree-sitter";
import { Colors } from "./colors";
import { EditorDecorationer, selectedDecorationType } from "./editorDecorations";
import { EditRange, editTree, getParser, handlerSyntaxNodeByRecursion, MiniCapture, MiniNode } from "./tsParser";

// Log output
const logOutput = vscode.window.createOutputChannel("Tree-Sitter-Viewer", { log: true });



/**
 * Webview state data type
 */
export interface AstWebviewState {
    // Document URI
    docUri: string;
    // Flattened array of syntax tree nodes
    nodes: MiniNode[];
    // Whether querying is enabled
    enableQuery: boolean;
    // Cached query text
    queryText: string;
    // Whether to show anonymous nodes
    showAnonymousNodes: boolean;
    // Whether node mapping is enabled
    enableNodeMapping: boolean;
    // Whether to output logs
    logOutput: boolean;
}

/**
 * Serialized abstract syntax tree webview
 */
interface SerializeAstWebview {
    // Serialized webview panel
    webviewPanel: vscode.WebviewPanel;
    // Serialized state data
    state: AstWebviewState;
}

/**
 * ASTWebviewManager class, manages creation and restoration of syntax tree webviews
 */
export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, AstWebview>();

    /**
     * Get the extension context
     * @returns {vscode.ExtensionContext} Extension context
     */
    public static get extensionContext(): vscode.ExtensionContext {
        return this._extensionContext;
    }

    /**
     * Initialize the manager
     * @param {vscode.ExtensionContext} extensionContext Extension context
     */
    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`);
            return;
        }
        this._extensionContext = extensionContext;
        // Register a webview serializer
        vscode.window.registerWebviewPanelSerializer(AstWebview.viewType, new AstWebviewSerializer());
    }

    /**
     * Create a syntax tree webview
     * @param {vscode.TextDocument} doc Document opened in vscode
     * @param {SerializeAstWebview} serializeWebview Optional, serialized webview
     */
    static async createAstWebview(doc: vscode.TextDocument, serializeWebview?: SerializeAstWebview) {
        let astWebview = this._cache.get(doc.uri.toString());
        if (astWebview) {
            astWebview.webviewPanel.reveal();
            return;
        }
        astWebview = new AstWebview(doc, serializeWebview);
        this._cache.set(doc.uri.toString(), astWebview);
    }

    /**
     * Delete the cache for the given URI.
     *
     * @param uri - URI whose cache should be deleted.
     */
    static deleteCache(uri: vscode.Uri) {
        this._cache.delete(uri.toString());
    }
}

/**
 * AstWebviewSerializer class, serializes and deserializes webviews
 */
export class AstWebviewSerializer implements vscode.WebviewPanelSerializer<AstWebviewState> {
    /**
     * Deserialize a webview
     * @param {vscode.WebviewPanel} webviewPanel Webview panel
     * @param {any} state State persisted in the webview
     */
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: AstWebviewState) {
        // Restore the webview content, making sure to keep the passed `webviewPanel` and restore any event listeners we need
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
            ASTWebviewManager.createAstWebview(doc, { webviewPanel, state });
        } catch (error) {
            console.error(error);
        }
    }
}

/**
 * Syntax tree webview class
 */
class AstWebview {
    public static readonly viewType = "tree-sitter-viewer.ast-webview";
    // Opened code document
    private readonly doc: vscode.TextDocument;
    private _webviewPanel!: vscode.WebviewPanel;
    private visible: boolean = false;
    private state!: AstWebviewState;
    private tsParser!: Parser;
    private astTree!: Tree;
    private editorDecorationer!: EditorDecorationer;
    /**
     * Promise resolved when the parser is initialized
     * Until tsParser and astTree are ready, all methods that use them await this Promise
     */
    private readonly parserReady: Promise<void>;
    public get webviewPanel() {
        return this._webviewPanel;
    }

    /**
     * Constructor
     * @param {vscode.TextDocument} doc Document opened in vscode
     * @param {SerializeAstWebview} serializeAstWebview Serialized webview
     */
    constructor(doc: vscode.TextDocument, serializeAstWebview?: SerializeAstWebview) {
        this.doc = doc;

        // Initialize the webview panel
        this.initWebviewPanel(serializeAstWebview);

        // Initialize the parser and parse the syntax tree
        this.parserReady = getParser(doc.languageId).then((parser) => {
            this.tsParser = parser;
            const tree = this.tsParser.parse(doc.getText());
            if (tree) {
                this.astTree = tree;
            }
            // Set up logging
            this.setLogOutput();
            // Refresh the webview page
            this.refreshWebview();
        }).catch((error) => {
            console.error("Failed to initialize parser:", error);
            vscode.window.showErrorMessage(`Failed to initialize parser: ${error.message}`);
        });

        // Get the editor of the current document
        const editor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.uri.toString() === this.doc.uri.toString()
        );
        if (editor) {
            // Initialize the editor decorator
            this.editorDecorationer = new EditorDecorationer(editor);
        }
    }

    /**
     * Initialize the webview panel
     * @param serializeAstWebview Webview serialized by vscode
     */
    private initWebviewPanel(serializeAstWebview?: SerializeAstWebview) {
        if (serializeAstWebview) {
            this._webviewPanel = serializeAstWebview.webviewPanel;
            this.state = serializeAstWebview.state;
        } else {
            // Create a new webviewPanel
            const viewTitle = `${path.basename(this.doc.fileName)} - Ast`;
            this._webviewPanel = vscode.window.createWebviewPanel(
                AstWebview.viewType,
                viewTitle,
                vscode.ViewColumn.Beside,
                { enableFindWidget: true }
            );
            this._webviewPanel.webview.options = { enableScripts: true };
            this.state = {
                docUri: this.doc.uri.toString(),
                nodes: [],
                enableQuery: false,
                queryText: "",
                showAnonymousNodes: false,
                enableNodeMapping: false,
                logOutput: false,
            };
        }
        this.visible = this._webviewPanel.visible;
        this.handlerEvent();
        // Update the webview page content
        this._webviewPanel.webview.html = this.getHtml();
    }

    /**
     * Set up event listeners
     */
    private handlerEvent() {
        // Listen for messages sent by the webview
        const receiveMessageDispose = this._webviewPanel.webview.onDidReceiveMessage((event) =>
            this.handleReceiveMessageEvent(event)
        );
        // Listen for webview state changes
        const webviewSateChangeDispose = this._webviewPanel.onDidChangeViewState((event) =>
            this.handleChangeViewStateEvent(event)
        );
        // Listen for document change events
        const textDocChangeDispose = vscode.workspace.onDidChangeTextDocument((event) =>
            this.handleChangeTextDocumentEvent(event)
        );
        // Listen for editor click and text selection events
        const changeSelectionDispose = vscode.window.onDidChangeTextEditorSelection((event) =>
            this.handleTextEditorChangeSelectEvent(event)
        );
        // Webview dispose event
        this._webviewPanel.onDidDispose(() => {
            receiveMessageDispose.dispose();
            webviewSateChangeDispose.dispose();
            textDocChangeDispose.dispose();
            changeSelectionDispose.dispose();

            // Remove selection styles
            vscode.window.activeTextEditor?.setDecorations(selectedDecorationType, []);
            ASTWebviewManager.deleteCache(this.doc.uri);
            this.editorDecorationer.clear();
        });
    }

    /**
     * Handle received message events
     * @param {any} event Received message event
     */
    private handleReceiveMessageEvent(event: any) {
        const { command, value } = event;
        switch (command) {
            case "showAnonymousNodes":
                this.state.showAnonymousNodes = value;
                this.refreshWebview();
                break;
            case "enableNodeMapping":
                this.state.enableNodeMapping = value;
                break;
            case "selectEditorText":
                const { startIndex, endIndex, isClick } = value;
                if (isClick || (this.state.enableNodeMapping && this._webviewPanel.active)) {
                    this.editorDecorationer?.renderSelectRange(startIndex, endIndex);
                }
                break;
            case "enableQuery":
                this.state.enableQuery = value;
                if (this.state.enableQuery && this.state.queryText) {
                    this.querySyntaxNode(this.state.queryText);
                } else {
                    this.querySyntaxNode('');
                }
                break;
            case "queryNode":
                this.state.queryText = value;
                this.querySyntaxNode(value);
                break;
            case "logOutput":
                this.state.logOutput = value;
                this.setLogOutput();
                break;
            default:
        }
    }

    /**
     * Handle view state change events
     * @param {vscode.WebviewPanelOnDidChangeViewStateEvent} event View state change event
     */
    private handleChangeViewStateEvent(event: vscode.WebviewPanelOnDidChangeViewStateEvent) {
        if (!this.visible && this._webviewPanel.visible) {
            // Refresh the view content
            this.refreshWebview();
            let viewColumn = vscode.ViewColumn.One;
            if (this._webviewPanel.viewColumn === vscode.ViewColumn.One) {
                viewColumn = vscode.ViewColumn.Beside;
            }
            // Make the text editor of the doc visible
            vscode.window.showTextDocument(this.doc, { preserveFocus: true, preview: false, viewColumn });
        }
        this.visible = this._webviewPanel.visible;
    }

    /**
     * Handle document content change events
     * @param {vscode.TextDocumentChangeEvent} event Document content change event
     */
    private async handleChangeTextDocumentEvent(event: vscode.TextDocumentChangeEvent) {
        // Wait for the parser to finish initializing
        await this.parserReady;

        const { document, contentChanges } = event;
        if (document.uri.toString() === this.doc.uri.toString()) {
            for (const change of contentChanges) {
                // Incrementally update the syntax tree
                this.astTree = await editTree(this.astTree, change, document);
            }
            if (contentChanges.length > 0) {
                await this.refreshWebview();
            }
        }
    }

    /**
     * Handle text editor selection change events
     * @param {vscode.TextEditorSelectionChangeEvent} event Text editor selection change event
     */
    private async handleTextEditorChangeSelectEvent(event: vscode.TextEditorSelectionChangeEvent) {
        // Wait for the parser to finish initializing
        await this.parserReady;

        const { textEditor, selections, kind } = event;
        const eventDoc = textEditor.document;
        const activeEditor = vscode.window.activeTextEditor;
        if (kind === vscode.TextEditorSelectionChangeKind.Mouse) {
            textEditor.setDecorations(selectedDecorationType, []);
        }
        if (
            !this._webviewPanel.active &&
            activeEditor?.document.uri.toString() === eventDoc.uri.toString() &&
            this.visible &&
            this.doc.uri.toString() === eventDoc.uri.toString()
        ) {
            const { anchor, active, isReversed, isEmpty } = selections[0];
            let startPosition: Point, endPosition: Point;
            if (isEmpty) {
                const range = eventDoc.getWordRangeAtPosition(anchor);
                if (range) {
                    startPosition = EditRange.asTSPoint(range.start);
                    endPosition = EditRange.asTSPoint(range.end);
                }
            } else {
                startPosition = EditRange.asTSPoint(isReversed ? active : anchor);
                endPosition = EditRange.asTSPoint(isReversed ? anchor : active);
            }

            // @ts-ignore
            if (startPosition && endPosition) {
                const gotoNode = this.astTree.rootNode.descendantForPosition(startPosition, endPosition);
                if (gotoNode) {
                    this._webviewPanel.webview.postMessage({
                        command: "gotoNode",
                        data: JSON.stringify(new MiniNode(gotoNode)),
                    });
                }
            }
        }
    }

    /**
     * Query syntax tree nodes
     * @param queryText Query text
     */
    async querySyntaxNode(queryText: string) {
        // Wait for the parser to finish initializing
        await this.parserReady;

        // Clear editor decorations (if the editor decorator is initialized)
        this.editorDecorationer?.clear();
        Colors.reset();
        try {
            let flatCaptures: MiniCapture[] = [];
            if (queryText && this.state.enableQuery) {
                const language = this.tsParser.language;
                if (!language) {
                    throw new Error("Parser language is not set");
                }
                const query = new Query(language, queryText);
                const matches = query.matches(this.astTree.rootNode);
                for (const { patternIndex, captures } of matches) {
                    for (const { name, node } of captures) {
                        const miniNode = new MiniNode(node);
                        const color = Colors.getColorForCaptureName(name);
                        flatCaptures.push({ pattern: patternIndex, name, node: miniNode, color });
                        this.editorDecorationer?.renderCaptureRange(miniNode, color);
                    }
                }

            }
            this._webviewPanel.webview.postMessage({ command: 'queryDone', data: flatCaptures });

        } catch (error: any) {
            const data = Object.assign({}, error);
            // An explicit assignment is required
            data.message = error.message;
            this._webviewPanel.webview.postMessage({ command: 'queryError', data });
        }
    }

    /**
     * Set up log output
     */
    private setLogOutput() {
        if (this.state.logOutput) {
            this.tsParser.setLogger((message: string, isLex: boolean) => {
                const prefix = isLex ? "[LEX]" : "[PARSE]";
                logOutput.appendLine(`${prefix}: ${message}`);
            });
            logOutput.show();
        } else {
            this.tsParser.setLogger(null);
        }
    }

    /**
     * Convert paths to a webview URI
     * @param {...string} paths Paths
     * @returns {vscode.Uri} Webview URI
     */
    private asWebviewUri(...paths: string[]): vscode.Uri {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this._webviewPanel.webview.asWebviewUri(path);
    }

    /**
     * Refresh the webview content
     */
    async refreshWebview() {
        this.state.nodes = [];
        await handlerSyntaxNodeByRecursion(this.astTree.rootNode, (node, walk) => {
            if (this.state.showAnonymousNodes || walk.nodeIsNamed) {
                this.state.nodes.push(new MiniNode(node, walk));
            }
        });

        this._webviewPanel.webview.postMessage({
            command: "refresh",
            data: JSON.stringify(this.state),
        });
    }

    /**
     * Get the HTML content
     * @returns {string} HTML content
     */
    private getHtml(): string {
        const styleVSCodeUri = this.asWebviewUri("css", "vscode.css");
        const astEditorUri = this.asWebviewUri("css", "astEditor.css");
        const scriptUri = this.asWebviewUri("..", "dist/webviewScript.js");
        const editorWorkJsUri = this.asWebviewUri("..", "dist/editor.worker.js");
        const cspSource = this._webviewPanel.webview.cspSource;
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <!-- Use a content security policy to restrict resource loading
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src 'nonce-${nonce}';"/>
                 -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Syntax Tree</title>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${astEditorUri}" rel="stylesheet" />
                <script nonce="${nonce}">const editorWorkJsUri='${editorWorkJsUri}';</script>
            </head>
            <body data-vscode-context='{"preventDefaultContextMenuItems": true}'>
                <div class="tool-container">
                    <div class="tool-item">
                        <input type="checkbox" id="log-output-checkbox" ></input>
                        <label for="log-output-checkbox">Show Logs</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="show-anonymous-checkbox" ></input>
                        <label for="show-anonymous-checkbox">Show Anonymous Nodes</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="node-mapping-checkbox" ></input>
                        <label for="node-mapping-checkbox">Map Nodes</label>
                    </div>
                    <div class="tool-item"> <!-- TODO feature not implemented, hidden for now -->
                        <input type="checkbox" id="enabled-query-checkbox"></input>
                        <label for="enabled-query-checkbox">Enable Query</label>
                    </div><br>
                </div>
                <div class="query-container" id="query-container" style="border-bottom: 1px solid #333333; height: 150px;">
                </div>
                <div id="row-resize"></div>
                <div class="split-line"><div>Abstract Syntax Tree: </div></div>
                <div id="output-container-scroll">
                    <div class="tree-container" id="tree-container">
                        <div class="row-number-container" id="row-number-container"></div>
                        <div id="output-container" class="highlight" tabindex="0" style="counter-increment: clusterize-counter -1">
                        </div>
                    </div>
                </div>
            </body>
            <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
        </html>
        `;
    }
}

/**
 * Generate a random string
 * @returns {string} Random string
 */
function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
