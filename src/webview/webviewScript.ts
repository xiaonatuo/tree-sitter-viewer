import { AstWebviewState } from "../astView";
import { MiniCapture, MiniNode, QueryError } from "../tsParser";
import { QueryEditor, QueryEditorTheme } from "./monaco";
import { decorativeResults } from "./queryResult";

const resizeElement = document.getElementById("row-resize") as HTMLElement;
const rowContainer = document.getElementById("output-container") as HTMLElement;
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
 * Listen for messages sent to the webview
 */
function listenWebviewMessage(queryEditor: QueryEditor) {
    // Add a listener for incoming messages
    window.addEventListener("message", (event) => {
        const { command, data } = event.data;
        switch (command) {
            case "refresh":
                refreshWebview(JSON.parse(data), queryEditor);
                break;
            case "scroll":
                // Scroll along with the editor
                const { line } = JSON.parse(data);
                const items = document.getElementsByClassName(`row-${line}`);
                items &&
                    items.length > 0 &&
                    items[0].scrollIntoView({
                        behavior: "smooth", // Smooth scrolling
                        block: "start", // Align element top with viewport top
                    });
                break;
            case "gotoNode":
                // Go to the given node
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
 * Listen for HTML element events
 */
function listenHtmlElementEvent(queryEditor: QueryEditor) {
    // Listen for text changes in the syntax tree query editor
    queryEditor.onValueChange((value) => {
        VIEW_STATE.queryText = value;
        VS_API.postMessage({ command: "queryNode", value });
        VS_API.setState(VIEW_STATE);
    });
    // Listen for changes to the show anonymous nodes checkbox and send its state
    showAnonymousCheckbox!.addEventListener("change", () => {
        const checked = showAnonymousCheckbox!.checked;
        VIEW_STATE.showAnonymousNodes = checked;
        VS_API.postMessage({ command: "showAnonymousNodes", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // Listen for changes to the enable query checkbox and send its state
    enableQueryCheckbox.addEventListener("change", () => {
        const checked = enableQueryCheckbox.checked;
        VIEW_STATE.enableQuery = checked;
        queryContainer.style.display = checked ? "block" : "none";
        VS_API.postMessage({ command: "enableQuery", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // Listen for changes to the node mapping checkbox and send its state
    nodeMappingCheckbox.addEventListener("change", () => {
        const checked = nodeMappingCheckbox.checked;
        VIEW_STATE.enableNodeMapping = checked;
        VS_API.postMessage({ command: "enableNodeMapping", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // Listen for changes to the log output checkbox and send its state
    logOutputCheckbox.addEventListener("change", () => {
        const checked = logOutputCheckbox.checked;
        VIEW_STATE.logOutput = checked;
        VS_API.postMessage({ command: "logOutput", value: checked });
        VS_API.setState(VIEW_STATE);
    });

    // Listen for mouse drag events on resizeElement
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

    // Listen for clicks on body; if the click is not on a node, send empty position data
    document.body.addEventListener('click', ({ target }) => {
        //@ts-ignore
        if (!target.classList.contains("node-link")) {
            VS_API.postMessage({ command: "selectEditorText", value: { startIndex: '', endIndex: '', isClick: true } });
        }
    });
}

/**
 * Refresh the webview
 * @param state View state data
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
 * Register event listeners for node elements (using event delegation, registered only once)
 *
 * Using event delegation, listen on the parent element and decide whether to handle based on the target's class name.
 * This avoids memory leaks caused by re-registering listeners on every DOM update.
 */
function registerNodeEventListeners(): void {
    // Use event delegation to listen for mouseover on node elements
    rowContainer.addEventListener("mouseover", (event: MouseEvent) => {
        const element = event.target as HTMLElement;
        if (element.classList.contains("node-link")) {
            VS_API.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(element.dataset)) });
        }
    });

    // Use event delegation to listen for clicks on node elements
    rowContainer.addEventListener("click", (event: MouseEvent) => {
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
 * Update the syntax tree
 */
function updateTree() {
    const nodes = VIEW_STATE.nodes;
    const nodeArray = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
    const htmls = treeNodeToHtml(nodeArray);
    rowContainer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
}

/**
 * Convert syntax tree nodes to HTML
 * @param {Array<MiniNode>} nodes Array of nodes
 * @returns {any} Object containing HTML strings
 */
function treeNodeToHtml(nodes: MiniNode[]): any {
    let rows = "", rowNumbers = "";

    // Depth of the previous iteration
    let prevLevel = -1;
    // Array of traversed node ids
    let idPath: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const { id, type, fieldName, level, isNamed, startIndex, endIndex, startPosition, endPosition } = nodes[i];

        // Compute the ID path from the node depth and convert it to anchor class selectors
        if (level <= prevLevel) {
            idPath = idPath.slice(0, level);
        }
        idPath.push('sp-' + id);
        prevLevel = level;

        const idPathClassName = idPath.join(' ');
        const { row: startRow, column: startColumn } = startPosition;
        const { row: endRow, column: endColumn } = endPosition;
        // Set indentation
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
 * Get the theme information of the webview page
 * @returns Editor theme configuration
 */
function getThemeInfo(): QueryEditorTheme {
    const themeKind = document.body.dataset.vscodeThemeKind;
    const themeStyle = window.getComputedStyle(document.body);

    // Convert RGB color strings
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
        // For colors property keys, see the official monaco documentation
        colors: {
            'editor.background': rgbStringToHex(themeStyle.backgroundColor)
        }
    };
}

/**
 * Initialize a syntax tree query editor
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
 * Anonymous self-invoking function
 */
(function () {
    const queryEditor = initMonacoEditor();
    listenWebviewMessage(queryEditor);
    listenHtmlElementEvent(queryEditor);
    registerNodeEventListeners();
})();