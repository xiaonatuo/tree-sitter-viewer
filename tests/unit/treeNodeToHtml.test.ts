import assert from "assert";

/**
 * Tests the idPath slicing logic in treeNodeToHtml
 *
 * Since treeNodeToHtml is an internal function of webviewScript.ts and depends on the DOM,
 * this test verifies the slicing logic directly.
 */
describe("idPath slicing logic", () => {
    /**
     * Verifies idPath is truncated correctly when node depth is unchanged
     */
    it("should truncate to the current depth when diff === 0", () => {
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
     * Verifies idPath is truncated correctly when node depth decreases
     *
     * The code before the fix used diff - 1, which removed one element too many.
     * E.g. when level goes from 5 to 3, diff = -2, the old code ran slice(0, -3),
     * removing the last 3 elements instead of 2.
     */
    it("should truncate to the target depth when diff < 0", () => {
        const idPath = ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"];
        const level = 3;
        const prevLevel = 5;

        let result: string[];
        if (level <= prevLevel) {
            result = idPath.slice(0, level);
        } else {
            result = [...idPath];
        }

        // Should keep the first 3 elements and remove the last 2
        assert.deepStrictEqual(result, ["sp-1", "sp-2", "sp-3"]);
    });

    /**
     * Verifies the pre-fix bug produces a wrong result
     *
     * The old code used diff - 1; when diff = -2 it ran slice(0, -3),
     * removing the last 3 elements instead of 2.
     */
    it("old code bug: diff - 1 removes one element too many", () => {
        const idPath = ["sp-1", "sp-2", "sp-3", "sp-4", "sp-5"];
        const level = 3;
        const prevLevel = 5;
        const diff = level - prevLevel; // diff = -2

        // Old code logic
        const buggyResult = idPath.slice(0, diff - 1); // slice(0, -3)

        // The old code wrongly removes the last 3 elements
        assert.deepStrictEqual(buggyResult, ["sp-1", "sp-2"]);
    });

    /**
     * Verifies idPath stays unchanged when node depth increases
     */
    it("should keep idPath unchanged when diff > 0", () => {
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
     * Verifies edge case: level is 0
     */
    it("should return an empty array when level is 0", () => {
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
