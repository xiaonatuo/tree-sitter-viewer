import { AstWebviewState } from "../astView";
import { MiniCapture, MiniNode, QueryError } from "../tsParser";
import { QueryEditor, QueryEditorTheme } from "./monaco";
import { decorativeResults } from "./queryResult";

const resizeElement = document.getElementById("row-resize") as HTMLElement;
const rowContianer = document.getElementById("output-container") as HTMLElement;
const rowNumberContainer = document.getElementById("row-number-container") as HTMLElement;
const queryContainer = document.getElementById("query-container") as HTMLElement;
const showAnonymousCheckbox = document.getElementById("show-anonymous-checkbox") as HTMLInputElement;
const enableQueryCheckbox = document.getElementById("enabled-query-checkbox") as HTMLInputElement;
const nodeMappingCheckbox = document.getElementById("node-mapping-checkbox") as HTMLInputElement;
const logOutputCheckbox = document.getElementById("log-output-checkbox") as HTMLInputElement;

interface VsCodeApi {
    setState: (state: AstWebviewState) => void;
    getState: () => AstWebviewState;
    postMessage: (data: any) => void
}

// @ts-ignore
const VS_API: VsCodeApi = acquireVsCodeApi();
const VIEW_STATE: AstWebviewState = {
    docUri: '',
    nodes: [],
    enableQuery: false,
    queryText: "",
    showAnonymousNodes: false,
    enableNodeMapping: false,
    logOutput: false,
};

/**
 * 监听webview发送的消息
 */
function listenWebviewMessage(queryEditor: QueryEditor) {
    // 添加接收消息的监听
    window.addEventListener("message", (event) => {
        const { command, data } = event.data;
        switch (command) {
            case "refresh":
                refreshWebview(JSON.parse(data), queryEditor);
                break;
            case "scroll":
                // 随编辑器滚动
                const { line } = JSON.parse(data);
                const items = document.getElementsByClassName(`row-${line}`);
                items &&
                    items.length > 0 &&
                    items[0].scrollIntoView({
                        behavior: "smooth", // 平滑滚动
                        block: "start", // 元素顶部对齐视口顶部
                    });
                break;
            case "gotoNode":
                // 定位到指定节点
                const { id } = JSON.parse(data);
                const element = document.getElementById(id);
                if (element) {
                    document.querySelectorAll("a.node-link-selected").forEach((item) => {
                        item.classList.remove("node-link-selected");
                    });
                    element.classList.add("node-link-selected");
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                break;
            case 'queryDone':
                queryEditor.showQueryError(null);
                const captures = data as MiniCapture[];
                decorativeResults(captures, VIEW_STATE);
                break;
            case 'queryError':
                const error = data as QueryError;
                queryEditor.showQueryError(error);
        }
    });
}

/**
 * 监听Html元素事件
 */
function listenHtmlElementEvent(queryEditor: QueryEditor) {
    // 监听语法树编辑器文本内容修改事件
    queryEditor.onValueChange((value) => {
        VIEW_STATE.queryText = value;
        VS_API.postMessage({ command: "queryNode", value });
        VS_API.setState(VIEW_STATE);
    });
    // 监听显示匿名节点选择框的修改事件，并发送对应状态
    showAnonymousCheckbox!.addEventListener("change", () => {
        const checked = showAnonymousCheckbox!.checked;
        VIEW_STATE.showAnonymousNodes = checked;
        VS_API.postMessage({ command: "showAnonymousNodes", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // 监听启用查询选择框的修改事件，并发送对应状态
    enableQueryCheckbox.addEventListener("change", () => {
        const checked = enableQueryCheckbox.checked;
        VIEW_STATE.enableQuery = checked;
        queryContainer.style.display = checked ? "block" : "none";
        VS_API.postMessage({ command: "enableQuery", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // 监听节点映射选择框的修改事件，并发送对应状态
    nodeMappingCheckbox.addEventListener("change", () => {
        const checked = nodeMappingCheckbox.checked;
        VIEW_STATE.enableNodeMapping = checked;
        VS_API.postMessage({ command: "enableNodeMapping", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // 监听输出日志选择框的修改事件，并发送对应状态
    logOutputCheckbox.addEventListener("change", () => {
        const checked = logOutputCheckbox.checked;
        VIEW_STATE.logOutput = checked;
        VS_API.postMessage({ command: "logOutput", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // 监听resizeElement的鼠标点击拖动的事件
    resizeElement.addEventListener("mousedown", (event) => {
        const startY = event.clientY;
        const startHeight = queryContainer.offsetHeight;
        resizeElement.style.height = '50px';
        resizeElement.style.marginTop = '-50px';

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = startHeight + (moveEvent.clientY - startY);
            queryContainer.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            resizeElement.style.height = '10px';
            resizeElement.style.marginTop = '-10px';
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

    // 监听body的鼠标点击事件，如果点击的不是节点，则发送一个空的位置数据
    document.body.addEventListener('click', ({ target }) => {
        //@ts-ignore
        if (!target.classList.contains("node-link")) {
            VS_API.postMessage({ command: "selectEditorText", value: { startIndex: '', endIndex: '', isClick: true } });
        }
    });
}

/**
 * 刷新web视图
 * @param state 视图状态数据
 */
function refreshWebview(state: any, queryEditor: QueryEditor) {
    Object.assign(VIEW_STATE, state);
    VS_API.setState(VIEW_STATE);
    showAnonymousCheckbox!.checked = VIEW_STATE.showAnonymousNodes;
    enableQueryCheckbox.checked = VIEW_STATE.enableQuery;
    nodeMappingCheckbox.checked = VIEW_STATE.enableNodeMapping;
    logOutputCheckbox.checked = VIEW_STATE.logOutput;
    queryContainer.style.display = VIEW_STATE.enableQuery ? "block" : "none";
    updateTree();
    if (queryEditor) {
        queryEditor.setValue(VIEW_STATE.queryText);
    }
}

/**
 * 注册节点元素的事件监听器（使用事件委托，只注册一次）
 *
 * 通过事件委托机制，在父元素上监听事件并根据目标元素的类名判断是否处理。
 * 避免每次更新 DOM 时重复注册监听器导致的内存泄漏。
 */
function registerNodeEventListeners(): void {
    // 使用事件委托监听节点元素鼠标悬浮事件
    rowContianer.addEventListener("mouseover", (event: MouseEvent) => {
        const element = event.target as HTMLElement;
        if (element.classList.contains("node-link")) {
            VS_API.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(element.dataset)) });
        }
    });

    // 使用事件委托监听节点元素鼠标点击事件
    rowContianer.addEventListener("click", (event: MouseEvent) => {
        const element = event.target as HTMLElement;
        if (element.classList.contains("node-link")) {
            document.querySelectorAll("a.node-link-selected").forEach((item) => {
                item.classList.remove("node-link-selected");
            });
            element.classList.add("node-link-selected");

            const data = Object.assign({ isClick: true }, element.dataset);
            VS_API.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(data)) });
        }
    });
}

/**
 * 更新语法树
 */
function updateTree() {
    const nodes = VIEW_STATE.nodes;
    const nodeArray = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
    const htmls = treeNodeToHtml(nodeArray);
    rowContianer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
}

/**
 * 将语法树节点转换为HTML
 * @param {Array<MiniNode>} nodes 节点数组
 * @returns {any} 包含HTML字符串的对象
 */
function treeNodeToHtml(nodes: MiniNode[]): any {
    let rows = "", rowNumbers = "";

    // 上次遍历的深度
    let prevLevel = -1;
    // 遍历的节点id数组
    let idPath: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const { id, type, fieldName, level, isNamed, startIndex, endIndex, startPosition, endPosition } = nodes[i];

        // 根据节点的深度，计算出ID路径，并转换为锚点类选择器
        const diff = level - prevLevel;
        if (diff === 0) {
            idPath = idPath.slice(0, level);
        } else if (diff < 0) {
            idPath = idPath.slice(0, level);
        }
        idPath.push('sp-' + id);
        prevLevel = level;

        const idPathClassName = idPath.join(' ');
        const { row: startRow, column: startColumn } = startPosition;
        const { row: endRow, column: endColumn } = endPosition;
        // 设置缩进
        let indentHtml = ``;
        for (let i = 0; i < level; i++) {
            indentHtml += `<span class="indent d-${i}">&nbsp;&nbsp;</span>`;
        }
        rows +=
            `<div class="row row-id-${id} ${idPathClassName}" data-deep="${level}">
                ${indentHtml}
                <div class="node-str">${fieldName && (fieldName + ":&nbsp;")}
                <a class="node-link a-${id} ${isNamed ? "named" : "anonymous"}" 
                    id="${id}"
                    href="javascript:void(0);" 
                    data-id="${id}"
                    data-range="${startRow},${startColumn},${endRow},${endColumn}" 
                    data-start-index="${startIndex}" 
                    data-end-index="${endIndex}">${type}</a>
                <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span>
                </div>
            </div>`;
        rowNumbers += `<div class="row row-${startRow}" id="rc-${startRow}-${startColumn}"><div class="row-num">${i + 1}</div><div class="arrow"></div></div>`;
    }
    return { rows, rowNumbers };
}

/**
 * 获取webview页面的主题信息
 * @returns 编辑器主题配置
 */
function getThemeInfo(): QueryEditorTheme {
    const themeKind = document.body.dataset.vscodeThemeKind;
    const themeStyle = window.getComputedStyle(document.body);

    // 将RGB格式的颜色字符进行转换
    const rgbStringToHex = (colorStr: string): string => {
        if (colorStr.startsWith('#')) {
            return colorStr;
        }
        const result = colorStr.match(/\d+/g);
        if (result && result.length === 3) {
            const [r, g, b] = result.map(Number);
            const toHex = (n: number) => {
                const hex = n.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        } else {
            throw new Error('Invalid RGB string format');
        }
    };
    return {
        themeKind,
        // colors 的属性key请参考monaco官方文档
        colors: {
            'editor.background': rgbStringToHex(themeStyle.backgroundColor)
        }
    };
}

/**
 * 初始化一个语法树查询编辑器
 */
function initMonacoEditor() {
    const editorElement = document.getElementById('query-container');
    const editor = new QueryEditor(editorElement!, {
        defaultValue: '',
        themeConfig: getThemeInfo()
    });
    return editor.create();
}

/**
 * 匿名自运行函数
 */
(function () {
    const queryEditor = initMonacoEditor();
    listenWebviewMessage(queryEditor);
    listenHtmlElementEvent(queryEditor);
    registerNodeEventListeners();
})();