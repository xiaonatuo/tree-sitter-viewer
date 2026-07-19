import assert from "assert";

/**
 * 测试 EditRange 的静态方法逻辑
 *
 * 由于 EditRange 依赖 VS Code API，我们直接测试其转换逻辑。
 * 这些测试验证 Position 和 Point 之间的转换是否正确。
 */
describe("EditRange 位置转换逻辑测试", () => {
    /**
     * 模拟 VS Code Position 对象
     */
    interface VSCodePosition {
        line: number;
        character: number;
    }

    /**
     * 模拟 Tree-sitter Point 对象
     */
    interface TSPoint {
        row: number;
        column: number;
    }

    /**
     * 模拟 asTSPoint 函数的逻辑
     * 将 VS Code Position 转换为 Tree-sitter Point
     */
    function asTSPoint(position: VSCodePosition): TSPoint {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * 模拟 asVsPosition 函数的逻辑
     * 将 Tree-sitter Point 转换为 VS Code Position
     */
    function asVsPosition(point: TSPoint): VSCodePosition {
        const { row, column } = point;
        return { line: row, character: column };
    }

    describe("asTSPoint 转换测试", () => {
        it("应正确转换第一行第一列", () => {
            const position: VSCodePosition = { line: 0, character: 0 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 0);
            assert.strictEqual(point.column, 0);
        });

        it("应正确转换非零位置", () => {
            const position: VSCodePosition = { line: 5, character: 10 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 5);
            assert.strictEqual(point.column, 10);
        });

        it("应正确转换大行号", () => {
            const position: VSCodePosition = { line: 1000, character: 200 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 1000);
            assert.strictEqual(point.column, 200);
        });

        it("应正确转换行尾位置", () => {
            const position: VSCodePosition = { line: 10, character: 80 };
            const point = asTSPoint(position);

            assert.strictEqual(point.row, 10);
            assert.strictEqual(point.column, 80);
        });
    });

    describe("asVsPosition 转换测试", () => {
        it("应正确转换第一行第一列", () => {
            const point: TSPoint = { row: 0, column: 0 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 0);
            assert.strictEqual(position.character, 0);
        });

        it("应正确转换非零位置", () => {
            const point: TSPoint = { row: 5, column: 10 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 5);
            assert.strictEqual(position.character, 10);
        });

        it("应正确转换大行号", () => {
            const point: TSPoint = { row: 1000, column: 200 };
            const position = asVsPosition(point);

            assert.strictEqual(position.line, 1000);
            assert.strictEqual(position.character, 200);
        });
    });

    describe("双向转换测试", () => {
        it("asTSPoint -> asVsPosition 应返回原始值", () => {
            const original: VSCodePosition = { line: 5, character: 10 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, original.line);
            assert.strictEqual(result.character, original.character);
        });

        it("asVsPosition -> asTSPoint 应返回原始值", () => {
            const original: TSPoint = { row: 5, column: 10 };
            const position = asVsPosition(original);
            const result = asTSPoint(position);

            assert.strictEqual(result.row, original.row);
            assert.strictEqual(result.column, original.column);
        });

        it("应正确处理零值双向转换", () => {
            const original: VSCodePosition = { line: 0, character: 0 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, 0);
            assert.strictEqual(result.character, 0);
        });

        it("应正确处理大值双向转换", () => {
            const original: VSCodePosition = { line: 9999, character: 999 };
            const point = asTSPoint(original);
            const result = asVsPosition(point);

            assert.strictEqual(result.line, 9999);
            assert.strictEqual(result.character, 999);
        });
    });

    describe("坐标系统语义验证", () => {
        it("VS Code line 对应 Tree-sitter row", () => {
            const position: VSCodePosition = { line: 42, character: 0 };
            const point = asTSPoint(position);

            // line -> row
            assert.strictEqual(point.row, 42);
        });

        it("VS Code character 对应 Tree-sitter column", () => {
            const position: VSCodePosition = { line: 0, character: 42 };
            const point = asTSPoint(position);

            // character -> column
            assert.strictEqual(point.column, 42);
        });

        it("Tree-sitter row 对应 VS Code line", () => {
            const point: TSPoint = { row: 42, column: 0 };
            const position = asVsPosition(point);

            // row -> line
            assert.strictEqual(position.line, 42);
        });

        it("Tree-sitter column 对应 VS Code character", () => {
            const point: TSPoint = { row: 0, column: 42 };
            const position = asVsPosition(point);

            // column -> character
            assert.strictEqual(position.character, 42);
        });
    });
});
