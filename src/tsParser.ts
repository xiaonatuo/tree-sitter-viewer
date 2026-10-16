import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Edit, Point, Node, TreeCursor, Language, Parser, Tree } from "web-tree-sitter";

// wasm file directory
const WASM_DIR = path.join(__dirname, 'tree-sitter');
// Parser instances per language
const TS_PARSER = new Map<string, Parser>();

/**
 * Tree-sitter query error
 */
export interface QueryError extends RangeError{
    // Character index of the error
    index: number;
    // Character length
    length: number;
}

/**
 * Represents a code edit range, used to update the syntax tree
 */
export class EditRange extends Edit {
    /**
     * Constructor, creates an edit range from a VSCode text change event
     * @param editChangeEvent VSCode text change event
     * @param document VSCode document object
     */
    constructor(editChangeEvent: vscode.TextDocumentContentChangeEvent, document: vscode.TextDocument) {
        const { range, rangeOffset, rangeLength, text } = editChangeEvent;

        const startIndex = rangeOffset;
        const oldEndIndex = rangeOffset + rangeLength;
        const newEndIndex = rangeOffset + text.length;

        const startPosition = EditRange.asTSPoint(range.start);
        const oldEndPosition = EditRange.asTSPoint(range.end);
        const newEndPosition = EditRange.asTSPoint(document.positionAt(newEndIndex));

        super({
            startIndex,
            oldEndIndex,
            newEndIndex,
            startPosition,
            oldEndPosition,
            newEndPosition
        });
    }

    /**
     * Convert a VSCode Position to a Tree-sitter Point
     * @param position VSCode Position object
     * @returns Tree-sitter Point object
     */
    static asTSPoint(position: vscode.Position): Point {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * Convert a Tree-sitter Point to a VSCode Position
     * @param Position Tree-sitter Point object
     * @returns VSCode Position object
     */
    static asVsPosition(point: Point):vscode.Position{
        const {row, column} = point;

        return new vscode.Position(row, column);
    }
}

/**
 * Simplified syntax tree node holding the node's basic information
 */
export class MiniNode {
    id: number;
    typeId: number;
    grammarId: number;
    type: string;
    grammarType: string;
    isNamed: boolean;
    isMissing: boolean;
    isExtra: boolean;
    hasChanges: boolean;
    hasError: boolean;
    isError: boolean;
    text: string;
    parseState: number;
    nextParseState: number;
    startPosition: Point;
    endPosition: Point;
    startIndex: number;
    endIndex: number;
    parentId?: number;
    children?: Array<MiniNode>;
    namedChildren?: Array<MiniNode>;
    childCount: number;
    namedChildCount: number;
    descendantCount: number;
    level: number;
    fieldId: number;
    fieldName?: string;

    /**
     * Constructor, creates a simplified node from a Tree-sitter syntax node
     * @param node Tree-sitter syntax node
     * @param walk Tree-sitter cursor object
     */
    constructor(node: Node, walk?: TreeCursor) {
        this.id = node.id;
        this.typeId = node.typeId;
        this.grammarId = node.grammarId;
        this.type = node.type;
        this.grammarType = node.grammarType;
        this.isNamed = node.isNamed;
        this.isMissing = node.isMissing;
        this.isExtra = node.isExtra;
        this.hasChanges = node.hasChanges;
        this.hasError = node.hasError;
        this.isError = node.isError;
        this.text = node.text;
        this.parseState = node.parseState;
        this.nextParseState = node.nextParseState;
        this.startPosition = node.startPosition;
        this.endPosition = node.endPosition;
        this.startIndex = node.startIndex;
        this.endIndex = node.endIndex;
        this.parentId = node.parent?.id;
        this.childCount = node.childCount;
        this.namedChildCount = node.namedChildCount;
        this.descendantCount = node.descendantCount;
        this.level = walk?.currentDepth || 0;
        this.fieldId = walk?.currentFieldId || -1;
        this.fieldName = walk?.currentFieldName || "";
    }
}
export interface MiniCapture{
    pattern: number;
    color: string;
    name: string;
    node: MiniNode;
}
/**
 * Recursively process syntax tree nodes
 * @param node Syntax tree node
 * @param handler Node handler function
 */
export async function handlerSyntaxNodeByRecursion(
    node: Node,
    handler: (node: Node, walk: TreeCursor) => void
) {
    const walk = node.walk();
    let walkIn = true;
    do {
        if (!walkIn) {
            // Walk up to the parent node
            if (!walk.gotoParent() || walk.nodeId === node.id) {
                break;
            }
            if (!walk.gotoNextSibling()) {
                continue;
            }
        }
        walkIn = true;
        handler(walk.currentNode, walk);
        if (walk.gotoFirstChild()) {
            continue;
        }
        if (walk.gotoNextSibling()) {
            continue;
        }
        walkIn = false;
    } while (true);
}

/**
 * Edit the syntax tree
 * @param tree Syntax tree
 * @param editChangeEvent Text change event
 * @param document VSCode document object
 * @returns Updated syntax tree
 */
export async function editTree(
    tree: Tree,
    editChangeEvent: vscode.TextDocumentContentChangeEvent,
    document: vscode.TextDocument
): Promise<Tree> {
    const parser = await getParser(document.languageId);
    const editRange = new EditRange(editChangeEvent, document);
    tree.edit(editRange);
    const newTree = parser.parse(document.getText(), tree);
    return newTree!;
}

/**
 * Get the Parser instance for the given language
 * @param language Language
 * @returns Parser instance
 */
export async function getParser(language: string) {
    let parser = TS_PARSER.get(language);
    if (parser) {
        return parser;
    }
    // Check the wasm file
    const error = await checkLanguageWasm(language);
    if (error) {
        vscode.window.showErrorMessage(error);
        throw new Error(error);
    }
    // Initialize the Parser instance
    return initTSParser(language);
}

/**
 * Initialize the Parser instance for the given language
 * @param language Language
 * @returns Parser instance
 */
async function initTSParser(language: string) {
    await Parser.init({locateFile: (pathName:string)=> path.join(WASM_DIR, pathName)});
    const parser = new Parser();
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    const languageWasm = await Language.load(wasmPath);
    parser.setLanguage(languageWasm);
    TS_PARSER.set(language, parser);
    return parser;
}

/**
 * Check whether the wasm file for the given language exists, downloading it if not
 * @param language Language
 * @returns Error message if an error occurred, otherwise undefined
 */
async function checkLanguageWasm(language: string): Promise<any> {
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    if (!fs.existsSync(wasmPath)) {
        // Download the wasm file
        if (!fs.existsSync(WASM_DIR)) {
            fs.mkdirSync(WASM_DIR);
        }
        // Download the wasm file into the wasm directory
        return downloadWasmFile(language, wasmPath);
    }
}

/**
 * Download the wasm file for the given language to the given path
 * @param language Language
 * @param wasmPath Path to save the wasm file
 * @returns Promise representing the download operation
 */
function downloadWasmFile(language: string, wasmPath: string): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
        vscode.window.withProgress(
            {
                title: `Downloading ${language} wasm file`,
                location: vscode.ProgressLocation.Notification,
            },
            async (progress, cancleToken) => {
                const wasmId = getWasmId(language);
                const packageName = getNpmPackageName(language);
                const wasmUrl = `https://unpkg.com/${packageName}/${wasmId}.wasm`;
                try {
                    const response = await fetch(wasmUrl);
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(wasmPath, buffer);
                    resolve(null);
                } catch (error) {
                    console.error(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                    resolve(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                } finally {
                    progress.report({ increment: 100 });
                }
            }
        );
    });
}

/**
 * Get the tree-sitter compliant wasm file name
 * @param language Language identifier
 * @returns wasm file name
 */
function getWasmId(language: string): string{
    let wasmId = `tree-sitter-${language}`;

    // Some VS Code language IDs differ from tree-sitter naming, so correct them here
    if (language === "csharp") {
        wasmId = "tree-sitter-c_sharp";
    } else if (language === "typescriptreact") {
        // The TSX wasm file lives in the tree-sitter-typescript package
        wasmId = "tree-sitter-tsx";
    } else if (language === "javascriptreact") {
        // JSX grammar is included in tree-sitter-javascript; there is no separate tree-sitter-jsx.wasm
        wasmId = "tree-sitter-javascript";
    } else if (language === "jsonc") {
        // JSONC uses the tree-sitter-json wasm file
        wasmId = "tree-sitter-json";
    }
    return wasmId;
}

/**
 * Get the npm package name
 * @param language Language identifier
 * @returns npm package name
 */
function getNpmPackageName(language: string): string{
    // TypeScript and TSX both come from the tree-sitter-typescript package
    if (language === "typescript" || language === "typescriptreact") {
        return "tree-sitter-typescript";
    }
    // JavaScript and JSX both come from the tree-sitter-javascript package
    if (language === "javascript" || language === "javascriptreact") {
        return "tree-sitter-javascript";
    }
    // C# uses c_sharp naming
    if (language === "csharp") {
        return "tree-sitter-c-sharp";
    }
    // JSONC uses the tree-sitter-json package
    if (language === "jsonc") {
        return "tree-sitter-json";
    }
    return `tree-sitter-${language}`;
}