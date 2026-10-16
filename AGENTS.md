# tree-sitter-viewer

VS Code extension that renders tree-sitter ASTs in a webview panel, similar to the tree-sitter playground.

## Commands

- `npm run compile` — build both bundles (extension + webview). Runs `copy:wasm` automatically.
- `npm run package` — production build for publishing (`vscode:prepublish`).
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`).
- `npm test` — runs VS Code integration tests via `@vscode/test-cli`. Requires `pretest` to have completed.
- `npm run pretest` — compiles tests, compiles extension, then lints. Run this before `npm test`.
- `npm run test:unit` — runs unit tests with Mocha (tests/unit/*.test.ts).

## Architecture

Two separate webpack bundles in `webpack.config.js`:

| Bundle | Target | Entry | Output |
|---|---|---|---|
| extension | Node (CommonJS2) | `src/extension.ts` | `dist/extension.js` |
| webview | Web (ES2022, UMD) | `src/webview/webviewScript.ts` | `dist/webviewScript.js` |

The webview bundle includes Monaco editor (scheme language only) via `monaco-editor-webpack-plugin`.

## WASM files

- `npm run copy:wasm` copies `tree-sitter*.wasm` from `node_modules/*/` into `dist/tree-sitter/` (flat).
- At runtime, if a language wasm is missing, the extension downloads it from `tree-sitter.github.io`. Bundled languages (bundled in `dist/`) skip the download.
- C# is a special case: VS Code language id `csharp` maps to wasm name `tree-sitter-c_sharp` (`src/tsParser.ts:287-293`).

## Key source files

- `src/extension.ts` — activate/deactivate, command registration
- `src/astView.ts` — `ASTWebviewManager` (singleton), `AstWebview` (panel lifecycle, event handling, HTML generation)
- `src/tsParser.ts` — parser init, wasm loading, incremental tree editing, `MiniNode`/`MiniCapture` types
- `src/editorDecorations.ts` — editor highlight decorations for selected AST nodes
- `src/colors.ts` — capture name color mapping
- `src/webview/webviewScript.ts` — webview-side JS (tree rendering, Monaco query editor)

## Conventions

- Comments and UI strings are in English.
- `tsconfig.json` targets ES2022 with CommonJS modules and strict mode.
- ESLint rules: `curly`, `eqeqeq`, `no-throw-literal`, `semi` as warnings; import naming must be camelCase or PascalCase.
- Tests use `@vscode/test-cli` with Mocha. Test output goes to `out/test/**/*.test.js` (compiled from `src/`).
- Unit tests use Mocha + jsdom + ts-node, located in `tests/unit/`.
- `dist/` and `out/` are gitignored; `dist/` is the packaged output.
