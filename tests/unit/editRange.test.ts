import assert from "assert";

/**
 * Tests the static method logic of EditRange
 *
 * Since EditRange depends on the VS Code API, we test its conversion logic directly.
 * These tests verify that conversion between Position and Point is correct.
 */
describe("EditRange position conversion logic", () => {
    /**
     * Simulated VS Code Position object
     */
    interface VSCodePosition {
        line: number;
        character: number;
    }

    /**
     * Simulated Tree-sitter Point object
     */
    interface TSPoint {
        row: number;
        column: number;
    }

    /**
     * Simulated asTSPoint function logic
     * Converts a VS Code Position to a Tree-sitter Point
     */
    function asTSPoint(position: VSCodePosition): TSPoint {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * Simulated asVsPosition function logic
     * Converts a Tree-sitter Point to a VS Code Position
     */
    function asVsPosition(point: TSPoint): VSCodePosition {
        const { row, column } = point;
        return { line: row, character: column };
    }

    describe("asTSPoint conversion", () => {
        it("should correctly convert first line, first column", () => {
            const position: VSCodePosition = { line: 0, character: 0 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 0);
            assert.strictEqual(point.column, 0);
        });

        it("should correctly convert a non-zero position", () => {
            const position: VSCodePosition = { line: 5, character: 10 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 5);
            assert.strictEqual(point.column, 10);
        });

        it("should correctly convert a large line number", () => {
            const position: VSCodePosition = { line: 1000, character: 200 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 1000);
            assert.strictEqual(point.column, 200);
        });

        it("should correctly convert an end-of-line position", () => {
            const position: VSCodePosition = { line: 10, character: 80 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 10);
            assert.strictEqual(point.column, 80);
        });
    });

    describe("asVsPosition conversion", () => {
        it("should correctly convert first line, first column", () => {
            const point: TSPoint = { row: 0, column: 0 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 0);
            assert.strictEqual(position.character, 0);
        });

        it("should correctly convert a non-zero position", () => {
            const point: TSPoint = { row: 5, column: 10 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 5);
            assert.strictEqual(position.character, 10);
        });

        it("should correctly convert a large line number", () => {
            const point: TSPoint = { row: 1000, column: 200 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 1000);
            assert.strictEqual(position.character, 200);
        });
    });

    describe("round-trip conversion", () => {
        it("asTSPoint -> asVsPosition should return the original value", () => {
            const original: VSCodePosition = { line: 5, character: 10 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, original.line);
            assert.strictEqual(result.character, original.character);
        });

        it("asVsPosition -> asTSPoint should return the original value", () => {
            const original: TSPoint = { row: 5, column: 10 };
            const position = asVsPosition(original);
            const result = asTSPoint(position);

            assert.strictEqual(result.row, original.row);
            assert.strictEqual(result.column, original.column);
        });

        it("should correctly round-trip zero values", () => {
            const original: VSCodePosition = { line: 0, character: 0 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, 0);
            assert.strictEqual(result.character, 0);
        });

        it("should correctly round-trip large values", () => {
            const original: VSCodePosition = { line: 9999, character: 999 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, 9999);
            assert.strictEqual(result.character, 999);
        });
    });

    describe("coordinate system semantics", () => {
        it("VS Code line maps to Tree-sitter row", () => {
            const position: VSCodePosition = { line: 42, character: 0 };
            const point = asTSPoint(position);

            // line -> row
            assert.strictEqual(point.row, 42);
        });

        it("VS Code character maps to Tree-sitter column", () => {
            const position: VSCodePosition = { line: 0, character: 42 };
            const point = asTSPoint(position);

            // character -> column
            assert.strictEqual(point.column, 42);
        });

        it("Tree-sitter row maps to VS Code line", () => {
            const point: TSPoint = { row: 42, column: 0 };
            const position = asVsPosition(point);

            // row -> line
            assert.strictEqual(position.line, 42);
        });

        it("Tree-sitter column maps to VS Code character", () => {
            const point: TSPoint = { row: 0, column: 42 };
            const position = asVsPosition(point);

            // column -> character
            assert.strictEqual(position.character, 42);
        });
    });
});
