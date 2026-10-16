import * as vscode from "vscode";
import { MiniNode } from "./tsParser";

/**
 * Decoration type
 */
class DecorationType {
    private _decorationType: vscode.TextEditorDecorationType;
    private _ranges: vscode.Range[] = [];
    constructor(color: string, private editor: vscode.TextEditor) {
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            color: '#FFFFFF',
            borderRadius: "4px",

        });
    }

    get decorationType() {
        return this._decorationType;
    }
    get ranges() {
        return this._ranges;
    }

    /**
     * Render the given range
     * @param range 
     */
    render(range: vscode.Range) {
        this._ranges.push(range);
        this.editor.setDecorations(this._decorationType, this._ranges);
    }

    /**
     * Clear all decorations
     */
    clear() {
        this._ranges = [];
        this.editor.setDecorations(this._decorationType, this._ranges);
    }
}

// Selection decoration type in the editor, i.e. the style of selected characters
export const selectedDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "#125381 !important",
    borderRadius: "4px",
    color: "#ea00b1",
    fontWeight: "bold",
    border: "1px solid #ea00b1",
});

// Color decoration types in the editor
const editorDecorationType: Map<string, DecorationType> = new Map();
/**
 * Get the decoration type for a color
 * @param color 
 * @param editor 
 * @returns 
 */
export function getDecorationTypeForColor(color: string, editor: vscode.TextEditor): DecorationType {
    if (editorDecorationType.has(color)) {
        return editorDecorationType.get(color)!;
    }
    const decorationType = new DecorationType(color, editor);
    editorDecorationType.set(color, decorationType);
    return decorationType;
}


/**
 * Editor decorator
 */
export class EditorDecorationer {
    private doc: vscode.TextDocument;
    constructor(private editor: vscode.TextEditor) {
        this.doc = editor.document;
    }

    /**
     * Render the selected range
     * @param startIndex 
     * @param endIndex 
     */
    renderSelectRange(startIndex: number, endIndex: number) {
        this.editor.setDecorations(selectedDecorationType, []);
        if (startIndex && endIndex) {
            const start = this.doc.positionAt(startIndex);
            const end = this.doc.positionAt(endIndex);
            
            this.editor.setDecorations(selectedDecorationType, [new vscode.Range(start, end)]);
            // Scroll to the selected content
            this.editor.revealRange(new vscode.Selection(start, end), vscode.TextEditorRevealType.InCenter);
        }
    }

    /**
     * Render the range of a captured node 
     * @param node 
     * @param color 
     */
    renderCaptureRange(node: MiniNode, color: string) {
        const decorationType = getDecorationTypeForColor(color, this.editor);
        const start = this.doc.positionAt(node.startIndex);
        const end = this.doc.positionAt(node.endIndex);
        decorationType.render(new vscode.Range(start, end));
    }

    /**
     * Clear all decorations
     */
    clear() {
        editorDecorationType.forEach((value) => value.clear());
        this.editor.setDecorations(selectedDecorationType, []);
    }
}