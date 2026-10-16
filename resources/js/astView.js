const rowContianer = document.getElementById("output-container");
const rowNumberContainer = document.getElementById("row-number-container");
const queryContainer = document.getElementById("query-container");
const queryTextarea = document.getElementById("query-input");
const showAnonymousCheckbox = document.getElementById("show-anonymous-checkbox");
const enableQueryCheckbox = document.getElementById("enabled-query-checkbox");
const nodeMappingCheckbox = document.getElementById("node-mapping-checkbox");
const logOutputCheckbox = document.getElementById("log-output-checkbox");

const vscode = acquireVsCodeApi();

/**
 * Global state class, manages the webview state
 */
class GlobalState {
    docUri = "";
    nodes = [];
    enableQuery = false;
    queryText = "";
    showAnonymousNodes = false;
    enableNodeMapping = true;
    logOutput = false;

    /**
     * Set the state
     * @param {Object} state State object
     */
    setState(state) {
        Object.assign(this, state);
        vscode.setState(this);

        showAnonymousCheckbox.checked = this.showAnonymousNodes;
        enableQueryCheckbox.checked = this.enableQuery;
        nodeMappingCheckbox.checked = this.enableNodeMapping;
        logOutputCheckbox.checked = this.logOutput;
        queryTextarea.value = this.queryText;
        queryContainer.style.display = this.enableQuery ? "block" : "none";

        updateTree(this.nodes);
    }

    /**
     * Set the document URI
     * @param {string} value Document URI
     */
    setDocUri(value) {
        this.docUri = value;
        vscode.setState(this);
    }

    /**
     * Set the node array
     * @param {Array} value Array of nodes
     */
    setNodes(value = []) {
        this.nodes = value;
        vscode.setState(this);
        updateTree(this.nodes);
    }

    /**
     * Set whether querying is enabled
     * @param {boolean} value Whether querying is enabled
     */
    setEnableQuery(value) {
        this.enableQuery = value;
        vscode.setState(this);
        queryContainer.style.display = this.enableQuery ? "block" : "none";
    }

    /**
     * Set the query text
     * @param {string} value Query text
     */
    setQueryText(value) {
        this.queryText = value;
        vscode.setState(this);
    }

    /**
     * Set whether anonymous nodes are shown
     * @param {boolean} value Whether anonymous nodes are shown
     */
    setShowAnonymousNodes(value) {
        this.showAnonymousNodes = value;
        vscode.setState(this);
    }

    /**
     * Set whether editor synchronization is enabled
     * @param {boolean} value Whether editor synchronization is enabled
     */
    setEnableNodeMapping(value) {
        this.enableNodeMapping = value;
        vscode.setState(this);
    }

    /**
     * Set whether logs are output
     * @param {boolean} value 
     */
    setLogOutput(value){
        this.logOutput = value;
        vscode.setState(this);
    }
}

(function () {
    const globalState = new GlobalState(); // Try to restore data from the state each time the page reloads

    // Add a listener for incoming messages
    window.addEventListener("message", (event) => {
        const { command, data } = event.data;
        switch (command) {
            case "refresh":
                globalState.setState(JSON.parse(data));
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
        }
    });

    // Listen for changes to the show anonymous nodes checkbox and send its state
    showAnonymousCheckbox.addEventListener("change", (that, event) => {
        const checked = showAnonymousCheckbox.checked;
        vscode.postMessage({ command: "showAnonymousNodes", value: checked });
        globalState.setShowAnonymousNodes(checked);
    });

    // Listen for changes to the enable query checkbox and send its state
    enableQueryCheckbox.addEventListener("change", (that, event) => {
        const checked = enableQueryCheckbox.checked;
        vscode.postMessage({ command: "enableQuery", value: checked });
        globalState.setEnableQuery(checked);
    });

    // Listen for changes to the query input and send its data
    queryTextarea.addEventListener("change", (that, event) => {
        const value = queryTextarea.value;
        vscode.postMessage({ command: "queryNode", value });
        globalState.setQueryText(queryTextarea.value);
        // TODO send data
    });

    // Listen for changes to the node mapping checkbox and send its state
    nodeMappingCheckbox.addEventListener("change", (that, event) => {
        const checked = nodeMappingCheckbox.checked;
        vscode.postMessage({ command: "enableNodeMapping", value: checked });
        globalState.setEnableNodeMapping(nodeMappingCheckbox.checked);
    });

    // Listen for changes to the log output checkbox and send its state
    logOutputCheckbox.addEventListener("change", (that, event) => {
        const checked = logOutputCheckbox.checked;
        vscode.postMessage({ command: "logOutput", value: checked });
        globalState.setLogOutput(logOutputCheckbox.checked);
    });

    // Listen for clicks on body; if the click is not on a node, send empty position data
    document.body.addEventListener('click', ({ target }) => {
        if (!target.classList.contains("node-link")) {
            vscode.postMessage({ command: "selectEditorText", value: { startIndex: '', endIndex: '', isClick: true } });
        }
    });

})();

/**
 * Update the syntax tree
 * @param {Array} nodes Array of nodes
 */
function updateTree(nodes) {
    if (!nodes || nodes.length <= 0) {
        return;
    }
    const nodeArray = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
    const htmls = treeNodeToHtml(nodeArray);
    rowContianer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
    // Listen for mouseover on node elements
    rowContianer.addEventListener("mouseover", (event) => {
        const element = event.target;
        if (element.classList.contains("node-link")) {
            vscode.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(element.dataset)) });
        }
    });
    // Listen for clicks on node elements
    rowContianer.addEventListener("click", (event) => {
        const element = event.target;
        if (element.classList.contains("node-link")) {
            document.querySelectorAll("a.node-link-selected").forEach((item) => {
                item.classList.remove("node-link-selected");
            });
            element.classList.add("node-link-selected");
            
            const data = Object.assign({isClick: true}, element.dataset);
            vscode.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(data)) });
        }
    });
}

/**
 * Convert syntax tree nodes to HTML
 * @param {Array} nodes Array of nodes
 * @returns {Object} Object containing HTML strings
 */
function treeNodeToHtml(nodes) {
    let rows = "",
        rowNumbers = "";
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { row: startRow, column: startColumn } = node.startPosition;
        const { row: endRow, column: endColumn } = node.endPosition;
        // Set indentation
        const indentHtml = `<span class="indent">&nbsp;&nbsp;</span>`.repeat(node.level);
        rows +=
            `<div class="row row-id-${node.id}">
            ${indentHtml}${node.fieldName && (node.fieldName + ":&nbsp;")}
            <a class="node-link a-${node.id} ${node.isNamed ? "named" : "anonymous"}" 
                id="${node.id}"
                href="javascript:void(0);" 
                data-id="${node.id}"
                data-range="${startRow},${startColumn},${endRow},${endColumn}" 
                data-start-index="${node.startIndex}" 
                data-end-index="${node.endIndex}">${node.type}</a>
            <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span>
        </div>`;
        rowNumbers += `<div class="row row-${startRow}" id="rc-${startRow}-${startColumn}">${i + 1}</div>`;
    }
    return { rows, rowNumbers };
}
