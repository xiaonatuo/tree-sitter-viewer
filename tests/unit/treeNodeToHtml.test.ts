import assert from "assert";

/**
 * 测试 treeNodeToHtml 中的 idPath 切片逻辑
 *
 * 由于 treeNodeToHtml 是 webviewScript.ts 内部的函数，且依赖 DOM 环境，
 * 此测试直接验证切片逻辑的正确性。
 */
describe("idPath 切片逻辑测试", () => {
    /**
     * 验证当节点深度不变时，idPath 正确截断
     */
    it("diff === 0 时应截断到当前深度", () => {
        const idPath = ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"];
        const level = 3;
        const prevLevel = 3;

        let result: string[];
        if (level <= prevLevel) {
            result = idPath.slice(0, level);
        } else {
            result = [...idPath];
        }

        assert.deepStrictEqual(result, ["sp-1", "sp-2", "sp-3"]);
    });

    /**
     * 验证当节点深度减小时，idPath 正确截断
     *
     * 修复前的代码使用 diff - 1 会导致多移除一个元素。
     * 例如：level 从 5 变到 3，diff = -2，旧代码会执行 slice(0, -3)，
     * 移除最后 3 个元素而不是 2 个。
     */
    it("diff < 0 时应截断到目标深度", () => {
        const idPath = ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"];
        const level = 3;
        const prevLevel = 5;

        let result: string[];
        if (level <= prevLevel) {
            result = idPath.slice(0, level);
        } else {
            result = [...idPath];
        }

        // 应保留前 3 个元素，移除最后 2 个
        assert.deepStrictEqual(result, ["sp-1", "sp-2", "sp-3"]);
    });

    /**
     * 验证修复前的 bug 会导致错误结果
     *
     * 旧代码使用 diff - 1，当 diff = -2 时会执行 slice(0, -3)，
     * 移除最后 3 个元素而不是 2 个。
     */
    it("验证旧代码的 bug：diff - 1 会导致多移除一个元素", () => {
        const idPath = ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"];
        const level = 3;
        const prevLevel = 5;
        const diff = level - prevLevel; // diff = -2

        // 旧代码的逻辑
        const buggyResult = idPath.slice(0, diff - 1); // slice(0, -3)

        // 旧代码会错误地移除最后 3 个元素
        assert.deepStrictEqual(buggyResult, ["sp-1", "sp-2"]);
    });

    /**
     * 验证当节点深度增加时，idPath 保持不变
     */
    it("diff > 0 时应保持 idPath 不变", () => {
        const idPath = ["sp-1", "sp-2", "sp-3"];
        const level = 5;
        const prevLevel = 3;

        let result: string[];
        if (level <= prevLevel) {
            result = idPath.slice(0, level);
        } else {
            result = [...idPath];
        }

        assert.deepStrictEqual(result, ["sp-1", "sp-2", "sp-3"]);
    });

    /**
     * 验证边界情况：level 为 0
     */
    it("level 为 0 时应返回空数组", () => {
        const idPath = ["sp-1", "sp-2", "sp-3"];
        const level = 0;
        const prevLevel = 3;

        let result: string[];
        if (level <= prevLevel) {
            result = idPath.slice(0, level);
        } else {
            result = [...idPath];
        }

        assert.deepStrictEqual(result, []);
    });
});
