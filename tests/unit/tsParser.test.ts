import assert from "assert";

/**
 * Tests the getWasmId and getNpmPackageName function logic in tsParser
 *
 * Since these functions are internal to tsParser.ts and not exported,
 * this test verifies their logic directly.
 */
describe("tsParser language mapping functions", () => {
    /**
     * getWasmId function logic verification
     *
     * Converts a VS Code language ID to a tree-sitter wasm file name
     */
    describe("getWasmId logic", () => {
        /**
         * Simulated getWasmId function logic
         */
        function getWasmId(language: string): string {
            let wasmId = `tree-sitter-${language}`;

            // Some VS Code language IDs differ from tree-sitter naming, so correct them here
            if (language === "csharp") {
                wasmId = "tree-sitter-c_sharp";
            } else if (language === "typescriptreact") {
                wasmId = "tree-sitter-tsx";
            } else if (language === "javascriptreact") {
                // JSX grammar is included in tree-sitter-javascript; there is no separate tree-sitter-jsx.wasm
                wasmId = "tree-sitter-javascript";
            } else if (language === "jsonc") {
                // JSONC uses the tree-sitter-json wasm file
                wasmId = "tree-sitter-json";
            }
            return wasmId;
        }

        it("regular languages should return the tree-sitter-{language} format", () => {
            assert.strictEqual(getWasmId("python"), "tree-sitter-python");
            assert.strictEqual(getWasmId("javascript"), "tree-sitter-javascript");
            assert.strictEqual(getWasmId("typescript"), "tree-sitter-typescript");
            assert.strictEqual(getWasmId("rust"), "tree-sitter-rust");
        });

        it("csharp should map to tree-sitter-c_sharp", () => {
            assert.strictEqual(getWasmId("csharp"), "tree-sitter-c_sharp");
        });

        it("typescriptreact should map to tree-sitter-tsx", () => {
            assert.strictEqual(getWasmId("typescriptreact"), "tree-sitter-tsx");
        });

        it("javascriptreact should map to tree-sitter-javascript (JSX grammar is included in tree-sitter-javascript)", () => {
            assert.strictEqual(getWasmId("javascriptreact"), "tree-sitter-javascript");
        });

        it("jsonc should map to tree-sitter-json", () => {
            assert.strictEqual(getWasmId("jsonc"), "tree-sitter-json");
        });
    });

    /**
     * getNpmPackageName function logic verification
     *
     * Converts a language ID to an npm package name
     */
    describe("getNpmPackageName logic", () => {
        /**
         * Simulated getNpmPackageName function logic
         */
        function getNpmPackageName(language: string): string {
            // TypeScript and TSX both come from the tree-sitter-typescript package
            if (language === "typescript" || language === "typescriptreact") {
                return "tree-sitter-typescript";
            }
            // JavaScript and JSX both come from the tree-sitter-javascript package
            if (language === "javascript" || language === "javascriptreact") {
                return "tree-sitter-javascript";
            }
            // C# uses c_sharp naming
            if (language === "csharp") {
                return "tree-sitter-c-sharp";
            }
            // JSONC uses the tree-sitter-json package
            if (language === "jsonc") {
                return "tree-sitter-json";
            }
            return `tree-sitter-${language}`;
        }

        it("TypeScript and TSX should return tree-sitter-typescript", () => {
            assert.strictEqual(getNpmPackageName("typescript"), "tree-sitter-typescript");
            assert.strictEqual(getNpmPackageName("typescriptreact"), "tree-sitter-typescript");
        });

        it("JavaScript and JSX should return tree-sitter-javascript", () => {
            assert.strictEqual(getNpmPackageName("javascript"), "tree-sitter-javascript");
            assert.strictEqual(getNpmPackageName("javascriptreact"), "tree-sitter-javascript");
        });

        it("C# should return tree-sitter-c-sharp", () => {
            assert.strictEqual(getNpmPackageName("csharp"), "tree-sitter-c-sharp");
        });

        it("JSONC should return tree-sitter-json", () => {
            assert.strictEqual(getNpmPackageName("jsonc"), "tree-sitter-json");
        });

        it("other languages should return the tree-sitter-{language} format", () => {
            assert.strictEqual(getNpmPackageName("python"), "tree-sitter-python");
            assert.strictEqual(getNpmPackageName("rust"), "tree-sitter-rust");
            assert.strictEqual(getNpmPackageName("go"), "tree-sitter-go");
        });
    });

    /**
     * Verifies getWasmId and getNpmPackageName used together
     *
     * Ensures the generated URL can correctly download the wasm file
     */
    describe("URL generation", () => {
        function getWasmId(language: string): string {
            let wasmId = `tree-sitter-${language}`;
            if (language === "csharp") {
                wasmId = "tree-sitter-c_sharp";
            } else if (language === "typescriptreact") {
                wasmId = "tree-sitter-tsx";
            } else if (language === "javascriptreact") {
                // JSX grammar is included in tree-sitter-javascript; there is no separate tree-sitter-jsx.wasm
                wasmId = "tree-sitter-javascript";
            } else if (language === "jsonc") {
                // JSONC uses the tree-sitter-json wasm file
                wasmId = "tree-sitter-json";
            }
            return wasmId;
        }

        function getNpmPackageName(language: string): string {
            if (language === "typescript" || language === "typescriptreact") {
                return "tree-sitter-typescript";
            }
            if (language === "javascript" || language === "javascriptreact") {
                return "tree-sitter-javascript";
            }
            if (language === "csharp") {
                return "tree-sitter-c-sharp";
            }
            if (language === "jsonc") {
                return "tree-sitter-json";
            }
            return `tree-sitter-${language}`;
        }

        it("TSX should generate the correct unpkg URL", () => {
            const language = "typescriptreact";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-typescript/tree-sitter-tsx.wasm");
        });

        it("JSX should generate the correct unpkg URL", () => {
            const language = "javascriptreact";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            // JSX grammar is included in tree-sitter-javascript; there is no separate tree-sitter-jsx.wasm
            assert.strictEqual(url, "https://unpkg.com/tree-sitter-javascript/tree-sitter-javascript.wasm");
        });

        it("C# should generate the correct unpkg URL", () => {
            const language = "csharp";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-c-sharp/tree-sitter-c_sharp.wasm");
        });

        it("Python should generate the correct unpkg URL", () => {
            const language = "python";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-python/tree-sitter-python.wasm");
        });

        it("JSONC should generate the correct unpkg URL", () => {
            const language = "jsonc";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-json/tree-sitter-json.wasm");
        });
    });
});
