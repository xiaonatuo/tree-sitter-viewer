import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Edit, Point, Node, TreeCursor, Language, Parser, Tree } from "web-tree-sitter";

// wasm文件目录
const WASM_DIR = path.join(__dirname, 'tree-sitter');
// 语言对应的Parser实例
const TS_PARSER = new Map<string, Parser>();

/**
 * Tree-sitter 查询语句错误
 */
export interface QueryError extends RangeError{
    // 错误所在字符索引
    index: number;
    // 字符长度
    length: number;
}

/**
 * 表示代码编辑范围，用于更新语法树
 */
export class EditRange extends Edit {
    /**
     * 构造函数，根据VSCode的文本变化事件创建编辑范围
     * @param editChangeEvent VSCode文本变化事件
     * @param document VSCode文档对象
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
     * 将VSCode的Position转换为Tree-sitter的Point
     * @param position VSCode的Position对象
     * @returns Tree-sitter的Point对象
     */
    static asTSPoint(position: vscode.Position): Point {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * 将Tree-sitter的Point转换为VSCode的Position
     * @param Position Tree-sitter的Point对象
     * @returns VSCode的Position对象
     */
    static asVsPosition(point: Point):vscode.Position{
        const {row, column} = point;

        return new vscode.Position(row, column);
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
 * 递归处理语法树节点
 * @param node 语法树节点
 * @param handler 节点处理函数
 */
export async function handlerSyntaxNodeByRecursion(
    node: Node,
    handler: (node: Node, walk: TreeCursor) => void
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
    await Parser.init({locateFile: (pathName:string)=> path.join(WASM_DIR, pathName)});
    const parser = new Parser();
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    const languageWasm = await Language.load(wasmPath);
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
 * 获取符合tree-sitter的wasm文件名
 * @param language 语言标识符
 * @returns wasm文件名
 */
function getWasmId(language: string): string{
    let wasmId = `tree-sitter-${language}`;

    // VS Code 中对于部分语言ID 与tree-sitter 的命名风格不一致，这里做矫正
    if (language === "csharp") {
        wasmId = "tree-sitter-c_sharp";
    } else if (language === "typescriptreact") {
        // TSX 的 wasm 文件在 tree-sitter-typescript 包中
        wasmId = "tree-sitter-tsx";
    } else if (language === "javascriptreact") {
        // JSX 语法包含在 tree-sitter-javascript 中，没有单独的 tree-sitter-jsx.wasm
        wasmId = "tree-sitter-javascript";
    }
    return wasmId;
}

/**
 * 获取npm包名
 * @param language 语言标识符
 * @returns npm包名
 */
function getNpmPackageName(language: string): string{
    // TypeScript 和 TSX 都来自 tree-sitter-typescript 包
    if (language === "typescript" || language === "typescriptreact") {
        return "tree-sitter-typescript";
    }
    // JavaScript 和 JSX 都来自 tree-sitter-javascript 包
    if (language === "javascript" || language === "javascriptreact") {
        return "tree-sitter-javascript";
    }
    // C# 使用 c_sharp 命名
    if (language === "csharp") {
        return "tree-sitter-c-sharp";
    }
    return `tree-sitter-${language}`;
}