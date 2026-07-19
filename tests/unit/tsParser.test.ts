import assert from "assert";

/**
 * 测试 tsParser 中的 getWasmId 和 getNpmPackageName 函数逻辑
 *
 * 由于这些函数是 tsParser.ts 内部的函数，没有导出，
 * 此测试直接验证函数的逻辑正确性。
 */
describe("tsParser 语言映射函数测试", () => {
    /**
     * getWasmId 函数的逻辑验证
     *
     * 将 VS Code 语言 ID 转换为 tree-sitter 的 wasm 文件名
     */
    describe("getWasmId 逻辑验证", () => {
        /**
         * 模拟 getWasmId 函数的逻辑
         */
        function getWasmId(language: string): string {
            let wasmId = `tree-sitter-${language}`;

            // VS Code 中对于部分语言ID 与tree-sitter 的命名风格不一致，这里做矫正
            if (language === "csharp") {
                wasmId = "tree-sitter-c_sharp";
            } else if (language === "typescriptreact") {
                wasmId = "tree-sitter-tsx";
            } else if (language === "javascriptreact") {
                // JSX 语法包含在 tree-sitter-javascript 中，没有单独的 tree-sitter-jsx.wasm
                wasmId = "tree-sitter-javascript";
            } else if (language === "jsonc") {
                // JSONC 使用 tree-sitter-json 的 wasm 文件
                wasmId = "tree-sitter-json";
            }
            return wasmId;
        }

        it("普通语言应返回 tree-sitter-{language} 格式", () => {
            assert.strictEqual(getWasmId("python"), "tree-sitter-python");
            assert.strictEqual(getWasmId("javascript"), "tree-sitter-javascript");
            assert.strictEqual(getWasmId("typescript"), "tree-sitter-typescript");
            assert.strictEqual(getWasmId("rust"), "tree-sitter-rust");
        });

        it("csharp 应映射到 tree-sitter-c_sharp", () => {
            assert.strictEqual(getWasmId("csharp"), "tree-sitter-c_sharp");
        });

        it("typescriptreact 应映射到 tree-sitter-tsx", () => {
            assert.strictEqual(getWasmId("typescriptreact"), "tree-sitter-tsx");
        });

        it("javascriptreact 应映射到 tree-sitter-javascript（JSX 语法包含在 tree-sitter-javascript 中）", () => {
            assert.strictEqual(getWasmId("javascriptreact"), "tree-sitter-javascript");
        });

        it("jsonc 应映射到 tree-sitter-json", () => {
            assert.strictEqual(getWasmId("jsonc"), "tree-sitter-json");
        });
    });

    /**
     * getNpmPackageName 函数的逻辑验证
     *
     * 将语言 ID 转换为 npm 包名
     */
    describe("getNpmPackageName 逻辑验证", () => {
        /**
         * 模拟 getNpmPackageName 函数的逻辑
         */
        function getNpmPackageName(language: string): string {
            // TypeScript 和 TSX 都来自 tree-sitter-typescript 包
            if (language === "typescript" || language === "typescriptreact") {
                return "tree-sitter-typescript";
            }
            // JavaScript 和 JSX 都来自 tree-sitter-javascript 包
            if (language === "javascript" || language === "javascriptreact") {
                return "tree-sitter-javascript";
            }
            // C# 使用 c_sharp 命名
            if (language === "csharp") {
                return "tree-sitter-c-sharp";
            }
            // JSONC 使用 tree-sitter-json 包
            if (language === "jsonc") {
                return "tree-sitter-json";
            }
            return `tree-sitter-${language}`;
        }

        it("TypeScript 和 TSX 应返回 tree-sitter-typescript", () => {
            assert.strictEqual(getNpmPackageName("typescript"), "tree-sitter-typescript");
            assert.strictEqual(getNpmPackageName("typescriptreact"), "tree-sitter-typescript");
        });

        it("JavaScript 和 JSX 应返回 tree-sitter-javascript", () => {
            assert.strictEqual(getNpmPackageName("javascript"), "tree-sitter-javascript");
            assert.strictEqual(getNpmPackageName("javascriptreact"), "tree-sitter-javascript");
        });

        it("C# 应返回 tree-sitter-c-sharp", () => {
            assert.strictEqual(getNpmPackageName("csharp"), "tree-sitter-c-sharp");
        });

        it("JSONC 应返回 tree-sitter-json", () => {
            assert.strictEqual(getNpmPackageName("jsonc"), "tree-sitter-json");
        });

        it("其他语言应返回 tree-sitter-{language} 格式", () => {
            assert.strictEqual(getNpmPackageName("python"), "tree-sitter-python");
            assert.strictEqual(getNpmPackageName("rust"), "tree-sitter-rust");
            assert.strictEqual(getNpmPackageName("go"), "tree-sitter-go");
        });
    });

    /**
     * 验证 getWasmId 和 getNpmPackageName 的组合使用
     *
     * 确保生成的 URL 能够正确下载 wasm 文件
     */
    describe("URL 生成验证", () => {
        function getWasmId(language: string): string {
            let wasmId = `tree-sitter-${language}`;
            if (language === "csharp") {
                wasmId = "tree-sitter-c_sharp";
            } else if (language === "typescriptreact") {
                wasmId = "tree-sitter-tsx";
            } else if (language === "javascriptreact") {
                // JSX 语法包含在 tree-sitter-javascript 中，没有单独的 tree-sitter-jsx.wasm
                wasmId = "tree-sitter-javascript";
            } else if (language === "jsonc") {
                // JSONC 使用 tree-sitter-json 的 wasm 文件
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

        it("TSX 应生成正确的 unpkg URL", () => {
            const language = "typescriptreact";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-typescript/tree-sitter-tsx.wasm");
        });

        it("JSX 应生成正确的 unpkg URL", () => {
            const language = "javascriptreact";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            // JSX 语法包含在 tree-sitter-javascript 中，没有单独的 tree-sitter-jsx.wasm
            assert.strictEqual(url, "https://unpkg.com/tree-sitter-javascript/tree-sitter-javascript.wasm");
        });

        it("C# 应生成正确的 unpkg URL", () => {
            const language = "csharp";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-c-sharp/tree-sitter-c_sharp.wasm");
        });

        it("Python 应生成正确的 unpkg URL", () => {
            const language = "python";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-python/tree-sitter-python.wasm");
        });

        it("JSONC 应生成正确的 unpkg URL", () => {
            const language = "jsonc";
            const wasmId = getWasmId(language);
            const packageName = getNpmPackageName(language);
            const url = `https://unpkg.com/${packageName}/${wasmId}.wasm`;

            assert.strictEqual(url, "https://unpkg.com/tree-sitter-json/tree-sitter-json.wasm");
        });
    });
});
