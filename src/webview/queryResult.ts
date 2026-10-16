import { AstWebviewState } from "../astView";
import { MiniCapture } from "../tsParser";

const resultDecorativerCache: Map<number, ResultDecorativer> = new Map();
/**
 * Clear the query result styles
 */
function clearColorCache() {
    resultDecorativerCache.forEach((value) => value.remove());
    resultDecorativerCache.clear();
}


/**
 * Decorator for syntax tree query results
 */
class ResultDecorativer {
    private syntaxNodeDom: HTMLElement | null = null;
    private topLineDom: HTMLElement | null = null;
    private textDom: HTMLElement | null = null;
    private identLineDoms?: NodeListOf<HTMLElement>;
    private captureNameDom: HTMLElement | null = null;

    constructor(private nodeId: number, private name: string, private color: string, private state: AstWebviewState) {
        // DOM of the captured syntax tree node
        this.syntaxNodeDom = document.querySelector<HTMLElement>(`.row.row-id-${this.nodeId}`);

        if (this.syntaxNodeDom) {
            this.topLineDom = this.syntaxNodeDom.querySelector<HTMLElement>('.node-str');
            // Syntax tree node type text DOM, whose font color is set
            this.textDom = this.syntaxNodeDom.querySelector<HTMLElement>('.node-link');
            const deep = this.syntaxNodeDom.getAttribute('data-deep');
            if (deep) {
                // Get the indent line DOM
                this.identLineDoms = document.querySelectorAll<HTMLElement>(`.row.sp-${this.nodeId} .indent.d-${deep}`);
            }
            this.captureNameDom = this.syntaxNodeDom.querySelector<HTMLElement>('.capture-name');
            if (!this.captureNameDom) {
                // Create it if it does not exist
                this.captureNameDom = document.createElement('span');
                this.captureNameDom.classList.add('capture-name');
                this.syntaxNodeDom.appendChild(this.captureNameDom);
            }

        }
    }

    /**
     * Reset color styles
     */
    remove() {
        if (this.topLineDom) {
            this.topLineDom.style.borderTop = '';
            this.topLineDom.style.borderLeft = '';
        }
        this.textDom && (this.textDom.style.color = '');
        this.identLineDoms && this.identLineDoms.forEach(dom => {
            dom.style.borderLeft = '';
        });
        this.captureNameDom && this.captureNameDom.remove();
        setTimeout(() => { }, 0);
    }

    /**
     * Set the name and color of the captured node
     * @param name Name of the captured node
     * @param color Color
     * @returns 
     */
    set(name: string, color: string) {
        this.name = name;
        this.color = color;
        return this;
    }

    /**
     * Render styles
     */
    render() {
        this.setTopLineStyle();
        this.setNodeTypeTextStyle();
        this.setIdentLineStyle();
        this.setCaptureNameDomStyle();
        setTimeout(() => { }, 0);
    }

    /**
     * Set the top border line style
     */
    setTopLineStyle() {
        if (this.topLineDom) {
            this.topLineDom.style.borderTop = `1px inset ${this.color}`;
            this.topLineDom.style.borderLeft = `1px inset ${this.color}`;
        }
    }

    /**
     * Set the font color of the node type text
     */
    setNodeTypeTextStyle() {
        if (this.textDom) {
            this.textDom.style.color = this.color;
        }
    }

    /**
     * Set the indent line style
     */
    setIdentLineStyle() {
        if (this.identLineDoms) {
            // Get the indent line DOM
            this.identLineDoms.forEach(element => {
                element.style.borderLeft = `1px inset ${this.color}`;
            });
        }
    }

    /**
     * Set the capture name DOM style
     */
    setCaptureNameDomStyle() {
        // Get the capture name DOM and set its style
        if (this.captureNameDom) {
            this.captureNameDom.style.color = this.color;
            this.captureNameDom.style.border = `1px inset ${this.color}40`;
            this.captureNameDom.style.borderTop = `1px inset ${this.color}`;
            this.captureNameDom.style.backgroundColor = this.color + '40';
            this.captureNameDom.textContent = '@' + this.name;

            this.captureNameDom.addEventListener('mouseover', () => {
                this.captureNameDom!.style.border = `1px solid ${this.color}`;
                if (this.topLineDom) {
                    this.topLineDom.style.borderTop = `1px solid ${this.color}`;
                    this.topLineDom.style.borderLeft = `1px solid ${this.color}`;
                }
                this.identLineDoms && this.identLineDoms.forEach(dom => {
                    dom.style.borderLeft = `1px solid ${this.color}`;
                });
                if (this.state?.enableNodeMapping) {
                    this.textDom && this.textDom.click();
                }
            });
            this.captureNameDom.addEventListener('mouseout', () => {
                this.captureNameDom!.style.border = `1px inset ${this.color}40`;
                this.captureNameDom!.style.borderTop = `1px inset ${this.color}`;
                if (this.topLineDom) {
                    this.topLineDom.style.borderTop = `1px inset ${this.color}`;
                    this.topLineDom.style.borderLeft = `1px inset ${this.color}`;
                }
                this.identLineDoms && this.identLineDoms.forEach(dom => {
                    dom.style.borderLeft = `1px inset ${this.color}`;
                });
            });
            this.captureNameDom.addEventListener('click', (event) => {
                event.stopPropagation();
                this.textDom && this.textDom.click();
            });
        }
    }
}

/**
 * Decorate the syntax tree page with query results
 * @param captures Captured query results
 */
export function decorativeResults(captures: MiniCapture[] = [], state: AstWebviewState) {
    clearColorCache();
    for (const { name, node, color } of captures) {
        let resultDecorativer = resultDecorativerCache.get(node.id);
        if (!resultDecorativer) {
            resultDecorativer = new ResultDecorativer(node.id, name, color, state);
            resultDecorativerCache.set(node.id, resultDecorativer);
        } else {
            resultDecorativer.set(name, color);
        }
        resultDecorativer.render();
    }

}

