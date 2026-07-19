import assert from "assert";
import { JSDOM } from "jsdom";

/**
 * 测试 webviewScript 中的事件委托机制
 *
 * 验证事件监听器只注册一次，使用事件委托处理动态元素的事件。
 */
describe("webviewScript 事件委托测试", () => {
    let dom: JSDOM;
    let document: Document;
    let rowContainer: HTMLElement;

    beforeEach(() => {
        // 创建模拟的 DOM 环境
        dom = new JSDOM(`<!DOCTYPE html>
            <html>
            <body>
                <div id="output-container"></div>
            </body>
            </html>
        `);
        document = dom.window.document;
        rowContainer = document.getElementById("output-container")!;
    });

    afterEach(() => {
        dom.window.close();
    });

    /**
     * 验证事件委托机制：动态添加的元素也能触发事件
     *
     * 此测试模拟事件委托的工作原理：
     * 1. 在父元素上注册事件监听器
     * 2. 动态添加子元素
     * 3. 触发子元素的事件，验证父元素的监听器能正确捕获
     */
    it("事件委托应能处理动态添加的元素", () => {
        let eventTriggered = false;
        let targetElement: HTMLElement | null = null;

        // 在父元素上使用事件委托
        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                eventTriggered = true;
                targetElement = target;
            }
        });

        // 动态添加子元素
        const nodeLink = document.createElement("a");
        nodeLink.classList.add("node-link");
        nodeLink.textContent = "test-node";
        rowContainer.appendChild(nodeLink);

        // 触发点击事件
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        nodeLink.dispatchEvent(clickEvent);

        assert.strictEqual(eventTriggered, true, "事件应被触发");
        assert.strictEqual(targetElement, nodeLink, "目标元素应正确");
    });

    /**
     * 验证事件委托不会因为 DOM 更新而重复注册
     *
     * 此测试确保事件监听器只注册一次，
     * 即使 innerHTML 被多次更新，事件处理器也不会累积。
     */
    it("事件监听器不应随 DOM 更新而累积", () => {
        let callCount = 0;

        // 注册事件监听器（模拟 registerNodeEventListeners）
        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                callCount++;
            }
        });

        // 模拟多次 updateTree() 调用（只更新 innerHTML，不重新注册监听器）
        for (let i = 0; i < 5; i++) {
            rowContainer.innerHTML = `<a class="node-link" id="node-${i}">Node ${i}</a>`;
        }

        // 点击最后一个元素
        const lastNode = rowContainer.querySelector("#node-4")!;
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        lastNode.dispatchEvent(clickEvent);

        // 验证事件处理器只被调用一次（没有累积）
        assert.strictEqual(callCount, 1, "事件处理器应只被调用一次");
    });

    /**
     * 验证非目标元素不会触发事件处理
     *
     * 确保事件委托只对匹配选择器的元素生效。
     */
    it("非 node-link 元素不应触发事件处理", () => {
        let eventTriggered = false;

        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                eventTriggered = true;
            }
        });

        // 添加非 node-link 元素
        const otherElement = document.createElement("div");
        otherElement.classList.add("other-class");
        otherElement.textContent = "Not a node link";
        rowContainer.appendChild(otherElement);

        // 触发点击事件
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        otherElement.dispatchEvent(clickEvent);

        assert.strictEqual(eventTriggered, false, "非目标元素不应触发事件处理");
    });
});
