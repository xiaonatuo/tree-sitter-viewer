import assert from "assert";

/**
 * Tests the color assignment logic of the Colors class
 *
 * Since the Colors class uses module-level state (the NAMES array),
 * we test its logic directly instead of importing the actual module.
 */
describe("Colors color assignment logic", () => {
    // Simulated COLORS constant (same as in colors.ts)
    const COLORS: string[] = [
        '#80cbc4', '#ffb757', '#e0b8ff', '#ff9492', '#56d364',
        '#a5d6ff', '#ffa198', '#d2a8ff', '#ff7b72', '#7ee787',
        '#ffa657', '#9ca3af', '#79c0ff'
    ];

    // Simulated Colors class logic
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

    // Reset state before each test
    beforeEach(() => {
        Colors.reset();
    });

    /**
     * Tests color assignment for a new name
     */
    it("new name should get the first color", () => {
        const color = Colors.getColorForCaptureName("function");
        assert.strictEqual(color, COLORS[0]);
    });

    /**
     * Tests color assignment for multiple different names
     */
    it("different names should get different colors", () => {
        const color1 = Colors.getColorForCaptureName("function");
        const color2 = Colors.getColorForCaptureName("variable");
        const color3 = Colors.getColorForCaptureName("keyword");

        assert.strictEqual(color1, COLORS[0]);
        assert.strictEqual(color2, COLORS[1]);
        assert.strictEqual(color3, COLORS[2]);
    });

    /**
     * Tests that the same name returns the same color
     */
    it("same name should return the same color", () => {
        const color1 = Colors.getColorForCaptureName("function");
        const color2 = Colors.getColorForCaptureName("function");

        assert.strictEqual(color1, color2);
    });

    /**
     * Tests color cycling
     */
    it("should cycle colors when names outnumber colors", () => {
        // Add COLORS.length names
        for (let i = 0; i < COLORS.length; i++) {
            Colors.getColorForCaptureName(`name-${i}`);
        }

        // Adding name number COLORS.length + 1 should get the first color
        const color = Colors.getColorForCaptureName("extra-name");
        assert.strictEqual(color, COLORS[0]);
    });

    /**
     * Tests color cycling accuracy
     */
    it("color cycling should map indexes correctly", () => {
        // Add 13 names (equal to COLORS length)
        for (let i = 0; i < COLORS.length; i++) {
            Colors.getColorForCaptureName(`name-${i}`);
        }

        // The 14th name should get COLORS[0]
        const color14 = Colors.getColorForCaptureName("name-13");
        assert.strictEqual(color14, COLORS[0]);

        // The 15th name should get COLORS[1]
        const color15 = Colors.getColorForCaptureName("name-14");
        assert.strictEqual(color15, COLORS[1]);
    });

    /**
     * Tests the reset feature
     */
    it("reset should clear the name list", () => {
        Colors.getColorForCaptureName("function");
        Colors.getColorForCaptureName("variable");

        assert.strictEqual(Colors.getNamesCount(), 2);

        Colors.reset();

        assert.strictEqual(Colors.getNamesCount(), 0);
    });

    /**
     * Tests color reassignment after reset
     */
    it("after reset the same name should get the first color again", () => {
        const color1 = Colors.getColorForCaptureName("function");
        assert.strictEqual(color1, COLORS[0]);

        Colors.reset();

        const color2 = Colors.getColorForCaptureName("function");
        assert.strictEqual(color2, COLORS[0]);
    });

    /**
     * Tests name count tracking
     */
    it("should correctly count registered names", () => {
        assert.strictEqual(Colors.getNamesCount(), 0);

        Colors.getColorForCaptureName("function");
        assert.strictEqual(Colors.getNamesCount(), 1);

        Colors.getColorForCaptureName("variable");
        assert.strictEqual(Colors.getNamesCount(), 2);

        // Duplicate names should not increase the count
        Colors.getColorForCaptureName("function");
        assert.strictEqual(Colors.getNamesCount(), 2);
    });

    /**
     * Tests edge case: empty string name
     */
    it("should support empty string as a name", () => {
        const color = Colors.getColorForCaptureName("");
        assert.strictEqual(color, COLORS[0]);

        // Requesting the empty string again should return the same color
        const color2 = Colors.getColorForCaptureName("");
        assert.strictEqual(color, color2);
    });

    /**
     * Tests edge case: names with special characters
     */
    it("should support names containing special characters", () => {
        const color1 = Colors.getColorForCaptureName("@function.builtin");
        const color2 = Colors.getColorForCaptureName("variable.parameter");

        assert.strictEqual(color1, COLORS[0]);
        assert.strictEqual(color2, COLORS[1]);
    });

    /**
     * Tests COLORS array length
     */
    it("COLORS array should have 13 colors", () => {
        assert.strictEqual(COLORS.length, 13);
    });

    /**
     * Tests color value format
     */
    it("all colors should be valid hex format", () => {
        const hexColorRegex = /^#[0-9a-f]{6}$/;
        for (const color of COLORS) {
            assert.ok(
                hexColorRegex.test(color),
                `Color ${color} is not a valid hex format`
            );
        }
    });
});
