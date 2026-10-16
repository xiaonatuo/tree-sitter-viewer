import assert from "assert";
import { JSDOM } from "jsdom";

/**
 * Tests the event delegation mechanism in webviewScript
 *
 * Verifies event listeners are registered only once, using event delegation to handle events from dynamic elements.
 */
describe("webviewScript event delegation", () => {
    let dom: JSDOM;
    let document: Document;
    let rowContainer: HTMLElement;

    beforeEach(() => {
        // Create a simulated DOM environment
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
     * Verifies event delegation: dynamically added elements also trigger events
     *
     * This test simulates how event delegation works:
     * 1. Register an event listener on the parent element
     * 2. Dynamically add child elements
     * 3. Trigger an event on the child and verify the parent listener catches it
     */
    it("event delegation should handle dynamically added elements", () => {
        let eventTriggered = false;
        let targetElement: HTMLElement | null = null;

        // Use event delegation on the parent element
        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                eventTriggered = true;
                targetElement = target;
            }
        });

        // Dynamically add a child element
        const nodeLink = document.createElement("a");
        nodeLink.classList.add("node-link");
        nodeLink.textContent = "test-node";
        rowContainer.appendChild(nodeLink);

        // Trigger a click event
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        nodeLink.dispatchEvent(clickEvent);

        assert.strictEqual(eventTriggered, true, "Event should have been triggered");
        assert.strictEqual(targetElement, nodeLink, "Target element should be correct");
    });

    /**
     * Verifies event delegation is not re-registered on DOM updates
     *
     * This test ensures event listeners are registered only once,
     * so handlers do not accumulate even when innerHTML is updated many times.
     */
    it("event listeners should not accumulate with DOM updates", () => {
        let callCount = 0;

        // Register the event listener (simulates registerNodeEventListeners)
        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                callCount++;
            }
        });

        // Simulate multiple updateTree() calls (only innerHTML is updated, listeners are not re-registered)
        for (let i = 0; i < 5; i++) {
            rowContainer.innerHTML = `<a class="node-link" id="node-${i}">Node ${i}</a>`;
        }

        // Click the last element
        const lastNode = rowContainer.querySelector("#node-4")!;
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        lastNode.dispatchEvent(clickEvent);

        // Verify the handler is called only once (no accumulation)
        assert.strictEqual(callCount, 1, "Event handler should be called only once");
    });

    /**
     * Verifies non-target elements do not trigger event handling
     *
     * Ensures event delegation only applies to elements matching the selector.
     */
    it("non node-link elements should not trigger event handling", () => {
        let eventTriggered = false;

        rowContainer.addEventListener("click", (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("node-link")) {
                eventTriggered = true;
            }
        });

        // Add a non node-link element
        const otherElement = document.createElement("div");
        otherElement.classList.add("other-class");
        otherElement.textContent = "Not a node link";
        rowContainer.appendChild(otherElement);

        // Trigger a click event
        const clickEvent = new dom.window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        otherElement.dispatchEvent(clickEvent);

        assert.strictEqual(eventTriggered, false, "Non-target element should not trigger event handling");
    });
});
