# Change Log

All notable changes to the "tree-sitter-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.8] - 2026-07-20

### 新增功能
- 添加 JSONC 语言支持（tree-sitter-json 现在同时支持 JSON 和 JSONC）
- 新增 50 个单元测试用例，覆盖核心逻辑

### 依赖升级
- 升级 web-tree-sitter 到 0.26.11（API 重构）
- 升级以下 tree-sitter 语言包到最新版本：
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

### Bug 修复
- 修复 JSX 语言 wasm 文件下载失败的问题（tree-sitter-javascript 包中没有 tree-sitter-jsx.wasm）
- 修复事件监听器泄漏问题（使用事件委托模式）
- 修复构造函数竞态条件（添加 parserReady Promise）
- 修复 editorDecorationer 可能为 undefined 导致的崩溃
- 修复 idPath 切片偏移一位的问题
- 修复变量名拼写错误（rowContianer → rowContainer）
- 修复 switch 语句缺少 break 导致的穿透问题
- 修复 webpack 编译错误（tsconfig 配置问题）

### 优化
- 简化 idPath 切片逻辑
- 更新 AGENTS.md 文档
- 配置单元测试框架（Mocha + jsdom + ts-node）
- 修复 VS Code 中测试文件类型识别问题
- 优化打包配置，移除不需要的文件（.mocharc.yml, AGENTS.md, tsconfig.test.json）

## [1.0.6] - 2025-07-15

### 新增功能
- 增加语法树查询功能
- 调整在不勾选映射节点的情况下，点击代码编辑器时语法树视图自动跳转对应语法节点位置

### Bug 修复
- 修复语法树查询结果在页面渲染不全的bug
- 优化资源管理器中右键查看语法树菜单的显示时机
- 调整捕获名称渲染颜色的优先级
- 优化Ast视图页面样式