# Change Log

All notable changes to the "tree-sitter-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.8] - 2026-07-20

### Features
- Add JSONC language support (tree-sitter-json now supports both JSON and JSONC)
- Add 50 unit test cases covering core logic

### Dependency Upgrades
- Upgrade web-tree-sitter to 0.26.11 (API refactor)
- Upgrade the following tree-sitter language packages to their latest versions:
  - tree-sitter-bash: 0.23.3 → 0.25.1
  - tree-sitter-c: 0.23.5 → 0.24.1
  - tree-sitter-c-sharp: 0.23.1 → 0.23.5
  - tree-sitter-css: 0.23.2 → 0.25.0
  - tree-sitter-go: 0.23.4 → 0.25.0
  - tree-sitter-javascript: 0.23.1 → 0.25.0
  - tree-sitter-php: 0.23.11 → 0.24.2
  - tree-sitter-python: 0.23.6 → 0.25.0
  - tree-sitter-regex: 0.24.3 → 0.25.0
  - tree-sitter-rust: 0.23.2 → 0.24.0
  - tree-sitter-scala: 0.23.4 → 0.24.0

### Bug Fixes
- Fix JSX language wasm file download failure (the tree-sitter-javascript package has no tree-sitter-jsx.wasm)
- Fix event listener leak (use event delegation pattern)
- Fix constructor race condition (add parserReady Promise)
- Fix crash caused by editorDecorationer possibly being undefined
- Fix off-by-one error in idPath slicing
- Fix variable name typo (rowContianer → rowContainer)
- Fix fall-through caused by missing break in switch statement
- Fix webpack build error (tsconfig configuration issue)

### Improvements
- Simplify idPath slicing logic
- Update AGENTS.md documentation
- Set up unit test framework (Mocha + jsdom + ts-node)
- Fix test file type recognition in VS Code
- Optimize packaging configuration, remove unneeded files (.mocharc.yml, AGENTS.md, tsconfig.test.json)

## [1.0.6] - 2025-07-15

### Features
- Add syntax tree query feature
- When node mapping is unchecked, clicking in the code editor now makes the syntax tree view jump to the corresponding node

### Bug Fixes
- Fix syntax tree query results not rendering completely on the page
- Improve when the "View Syntax Tree" context menu appears in the Explorer
- Adjust priority of capture name rendering colors
- Improve AST view page styles