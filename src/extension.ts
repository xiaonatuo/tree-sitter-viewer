import * as vscode from "vscode";
import { AstEditorProvider } from "./astEditor";
import { getParser } from "./parser";

/**
 * 扩展插件的入口函数，激活扩展时将调用此方法
 * @param context 扩展插件的上下文
 */
export function activate(context: vscode.ExtensionContext) {
    // 注册抽象语法树编辑器AstEditor
    const astEditorProvider = new AstEditorProvider(context);
    const astEditorDisposable = vscode.window.registerCustomEditorProvider(
        AstEditorProvider.viewType,
        astEditorProvider
    );
    context.subscriptions.push(astEditorDisposable);

    // 注册查看语法树命令
    const disposable = vscode.commands.registerCommand("tree-sitter-viewer.view-syntax-tree", viewSyntaxTreeCommand);
    context.subscriptions.push(disposable);
}

// 停用扩展时将调用此方法
export function deactivate() {}

/**
 * 查看语法树命令处理函数
 * @param args
 * @returns
 */
async function viewSyntaxTreeCommand(args: any[]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
    }
    // 获取当前编辑器的语言
    const language = editor.document.languageId;
    // 获取语法树
    const parser = await getParser(language);
    // 获取代码文本
    const content = editor.document.getText();
    // 解析代码文本生成语法树
    const tree = parser.parse(content);
    console.log(tree.rootNode.toString());
}
