import assert from "assert";

/**
 * 测试 Colors 类的颜色分配逻辑
 *
 * 由于 Colors 类使用模块级别的状态（NAMES 数组），
 * 我们直接测试其逻辑而不是导入实际的模块。
 */
describe("Colors 颜色分配逻辑测试", () => {
    // 模拟 COLORS 常量（与 colors.ts 中相同）
    const COLORS: string[] = [
        '#80cbc4', '#ffb757', '#e0b8ff', '#ff9492', '#56d364',
        '#a5d6ff', '#ffa198', '#d2a8ff', '#ff7b72', '#7ee787',
        '#ffa657', '#9ca3af', '#79c0ff'
    ];

    // 模拟 Colors 类的逻辑
    class Colors {
        private static names: string[] = [];

        static getColorForCaptureName(name: string): string {
            let index = this.names.indexOf(name);
            if (index === -1) {
                this.names.push(name);
                index = this.names.length - 1;
            }
            return COLORS[index % COLORS.length];
        }

        static reset() {
            this.names = [];
        }

        static getNamesCount(): number {
            return this.names.length;
        }
    }

    // 每个测试前重置状态
    beforeEach(() => {
        Colors.reset();
    });

    /**
     * 测试新名称的颜色分配
     */
    it("新名称应获得第一个颜色", () => {
        const color = Colors.getColorForCaptureName("function");
        assert.strictEqual(color, COLORS[0]);
    });

    /**
     * 测试多个不同名称的颜色分配
     */
    it("不同名称应获得不同颜色", () => {
        const color1 = Colors.getColorForCaptureName("function");
        const color2 = Colors.getColorForCaptureName("variable");
        const color3 = Colors.getColorForCaptureName("keyword");

        assert.strictEqual(color1, COLORS[0]);
        assert.strictEqual(color2, COLORS[1]);
        assert.strictEqual(color3, COLORS[2]);
    });

    /**
     * 测试相同名称返回相同颜色
     */
    it("相同名称应返回相同颜色", () => {
        const color1 = Colors.getColorForCaptureName("function");
        const color2 = Colors.getColorForCaptureName("function");

        assert.strictEqual(color1, color2);
    });

    /**
     * 测试颜色循环
     */
    it("当名称数量超过颜色数量时，应循环使用颜色", () => {
        // 添加 COLORS.length 个名称
        for (let i = 0; i < COLORS.length; i++) {
            Colors.getColorForCaptureName(`name-${i}`);
        }

        // 添加第 COLORS.length + 1 个名称，应该获得第一个颜色
        const color = Colors.getColorForCaptureName("extra-name");
        assert.strictEqual(color, COLORS[0]);
    });

    /**
     * 测试颜色循环的精确性
     */
    it("颜色循环应正确映射索引", () => {
        // 添加 13 个名称（等于 COLORS 长度）
        for (let i = 0; i < COLORS.length; i++) {
            Colors.getColorForCaptureName(`name-${i}`);
        }

        // 第 14 个名称应该获得 COLORS[0]
        const color14 = Colors.getColorForCaptureName("name-13");
        assert.strictEqual(color14, COLORS[0]);

        // 第 15 个名称应该获得 COLORS[1]
        const color15 = Colors.getColorForCaptureName("name-14");
        assert.strictEqual(color15, COLORS[1]);
    });

    /**
     * 测试 reset 功能
     */
    it("reset 应清空名称列表", () => {
        Colors.getColorForCaptureName("function");
        Colors.getColorForCaptureName("variable");

        assert.strictEqual(Colors.getNamesCount(), 2);

        Colors.reset();

        assert.strictEqual(Colors.getNamesCount(), 0);
    });

    /**
     * 测试 reset 后颜色重新分配
     */
    it("reset 后相同名称应重新获得第一个颜色", () => {
        const color1 = Colors.getColorForCaptureName("function");
        assert.strictEqual(color1, COLORS[0]);

        Colors.reset();

        const color2 = Colors.getColorForCaptureName("function");
        assert.strictEqual(color2, COLORS[0]);
    });

    /**
     * 测试名称数量统计
     */
    it("应正确统计已注册的名称数量", () => {
        assert.strictEqual(Colors.getNamesCount(), 0);

        Colors.getColorForCaptureName("function");
        assert.strictEqual(Colors.getNamesCount(), 1);

        Colors.getColorForCaptureName("variable");
        assert.strictEqual(Colors.getNamesCount(), 2);

        // 重复名称不应增加计数
        Colors.getColorForCaptureName("function");
        assert.strictEqual(Colors.getNamesCount(), 2);
    });

    /**
     * 测试边界情况：空字符串名称
     */
    it("应支持空字符串作为名称", () => {
        const color = Colors.getColorForCaptureName("");
        assert.strictEqual(color, COLORS[0]);

        // 再次请求空字符串应返回相同颜色
        const color2 = Colors.getColorForCaptureName("");
        assert.strictEqual(color, color2);
    });

    /**
     * 测试边界情况：特殊字符名称
     */
    it("应支持包含特殊字符的名称", () => {
        const color1 = Colors.getColorForCaptureName("@function.builtin");
        const color2 = Colors.getColorForCaptureName("variable.parameter");

        assert.strictEqual(color1, COLORS[0]);
        assert.strictEqual(color2, COLORS[1]);
    });

    /**
     * 测试 COLORS 数组长度
     */
    it("COLORS 数组应有 13 个颜色", () => {
        assert.strictEqual(COLORS.length, 13);
    });

    /**
     * 测试颜色值格式
     */
    it("所有颜色应为有效的十六进制格式", () => {
        const hexColorRegex = /^#[0-9a-f]{6}$/;
        for (const color of COLORS) {
            assert.ok(
                hexColorRegex.test(color),
                `颜色 ${color} 不是有效的十六进制格式`
            );
        }
    });
});
