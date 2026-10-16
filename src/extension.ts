import * as vscode from "vscode";
import { ASTWebviewManager } from "./astView";

/**
 * Extension entry point, called when the extension is activated
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    // Initialize the AST webview manager
    ASTWebviewManager.initManager(context);
    // Register the view syntax tree command
    const disposable = vscode.commands.registerCommand("tree-sitter-viewer.view-syntax-tree", viewSyntaxTreeCommand);
    context.subscriptions.push(disposable);
}

// Called when the extension is deactivated
export function deactivate() { }

/**
 * Handler for the view syntax tree command
 * @param args
 * @returns
 */
async function viewSyntaxTreeCommand(uri: vscode.Uri) {
    let resource: vscode.Uri = uri, doc: vscode.TextDocument | undefined;
    if (resource) {
        const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
        if (!editor || (resource.toString() !== editor.document.uri.toString())) {
            await vscode.commands.executeCommand('vscode.open', resource);
        }
        doc = vscode.window.activeTextEditor?.document;
    }

    if (!doc) {
        vscode.window.showInformationMessage("No provided any resources");
        return;
    }
    ASTWebviewManager.createAstWebview(doc);
}