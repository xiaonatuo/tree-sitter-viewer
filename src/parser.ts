import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import Parser, { Edit, Point, SyntaxNode, TreeCursor } from "web-tree-sitter";

// wasm文件目录
const WASM_DIR = __dirname;
// 语言对应的Parser实例
const TS_PARSER = new Map<string, Parser>();

/**
 * 表示代码编辑范围，用于更新语法树
 */
export class EditRange implements Edit {
    startIndex: number;
    oldEndIndex: number;
    newEndIndex: number;

    startPosition: Parser.Point;
    oldEndPosition: Parser.Point;
    newEndPosition: Parser.Point;

    /**
     * 构造函数，根据VSCode的文本变化事件创建编辑范围
     * @param editChangeEvent VSCode文本变化事件
     * @param document VSCode文档对象
     */
    constructor(editChangeEvent: vscode.TextDocumentContentChangeEvent, document: vscode.TextDocument) {
        const { range, rangeOffset, rangeLength, text } = editChangeEvent;

        this.startIndex = rangeOffset;
        this.oldEndIndex = rangeOffset + rangeLength;
        this.newEndIndex = rangeOffset + text.length;

        this.startPosition = EditRange.asTSPoint(range.start);
        this.oldEndPosition = EditRange.asTSPoint(range.end);
        this.newEndPosition = EditRange.asTSPoint(document.positionAt(this.newEndIndex));
    }

    /**
     * 将VSCode的Position转换为Tree-sitter的Point
     * @param position VSCode的Position对象
     * @returns Tree-sitter的Point对象
     */
    static asTSPoint(position: vscode.Position): Parser.Point {
        const { line, character } = position;
        return { row: line, column: character };
    }
}

/**
 * 表示语法树的简化节点，包含节点的基本信息
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
     * 构造函数，根据Tree-sitter的语法节点创建简化节点
     * @param node Tree-sitter的语法节点
     * @param walk Tree-sitter的游标对象
     */
    constructor(node: SyntaxNode, walk?: TreeCursor) {
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

/**
 * 递归处理语法树节点
 * @param node 语法树节点
 * @param handler 节点处理函数
 */
export async function handlerSyntaxNodeByRecursion(
    node: SyntaxNode,
    handler: (node: SyntaxNode, walk: TreeCursor) => void
) {
    const walk = node.walk();
    let walkIn = true;
    do {
        if (!walkIn) {
            // 向父节点游走
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
 * 编辑语法树
 * @param tree 语法树
 * @param editChangeEvent 文本变化事件
 * @param document VSCode文档对象
 * @returns 更新后的语法树
 */
export async function editTree(
    tree: Parser.Tree,
    editChangeEvent: vscode.TextDocumentContentChangeEvent,
    document: vscode.TextDocument
) {
    const parser = await getParser(document.languageId);
    const editRange = new EditRange(editChangeEvent, document);
    tree.edit(editRange);
    return parser.parse(document.getText(), tree);
}

/**
 * 获取指定语言的Parser实例
 * @param language 语言
 * @returns Parser实例
 */
export async function getParser(language: string) {
    let parser = TS_PARSER.get(language);
    if (parser) {
        return parser;
    }
    // 检查wasm文件
    const error = await checkLanguageWasm(language);
    if (error) {
        vscode.window.showErrorMessage(error);
        throw new Error(error);
    }
    // 初始化Parser实例
    return initTSParser(language);
}

/**
 * 初始化指定语言的Parser实例
 * @param language 语言
 * @returns Parser实例
 */
async function initTSParser(language: string) {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    const languageWasm = await Parser.Language.load(wasmPath);
    parser.setLanguage(languageWasm);
    TS_PARSER.set(language, parser);
    return parser;
}

/**
 * 检查是否存在指定语言的wasm文件，如果不存在则下载
 * @param language 语言
 * @returns 错误信息，如果存在错误则返回错误信息，否则返回undefined
 */
async function checkLanguageWasm(language: string): Promise<any> {
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    if (!fs.existsSync(wasmPath)) {
        // 下载wasm文件
        if (!fs.existsSync(WASM_DIR)) {
            fs.mkdirSync(WASM_DIR);
        }
        // 下载wasm文件到wasm目录下
        return downloadWasmFile(language, wasmPath);
    }
}

/**
 * 下载指定语言的wasm文件到指定路径
 * @param language 语言
 * @param wasmPath wasm文件保存路径
 * @returns Promise对象，表示下载操作
 */
function downloadWasmFile(language: string, wasmPath: string): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
        vscode.window.withProgress(
            {
                title: `Downloading ${language} wasm file`,
                location: vscode.ProgressLocation.Notification,
            },
            async (progress, cancleToken) => {
                // 使用fetch下载wasm文件
                const wasmUrl = `https://tree-sitter.github.io/tree-sitter-${language}.wasm`;
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
 * 获取符合tree-sitter的wasm文件名
 * @param language 语言标识符
 * @returns wasm文件名
 */
function getWasmId(language: string): string{
    let wasmId = `tree-sitter-${language}`;

    // VS Code 中对于 C# 语言ID 与tree-sitter 的命名风格不一致，这里做矫正
    if (language === "csharp") {
        wasmId = "tree-sitter-c_sharp";
    }
    return wasmId;
}