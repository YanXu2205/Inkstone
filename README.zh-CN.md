<div align="center">

<img src="public/icon.svg" width="96" alt="Inkstone logo" />

# Inkstone · 砚

**免费、开源、本地优先的所见即所得 Markdown 编辑器。**  
受 [Typora](https://typora.io) 启发 —— 与 Typora 无任何隶属关系。

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)

*[English](README.md) · 简体中文*

</div>

---

![浅色主题](docs/screenshot-light.png)

在同一个编辑区写 Markdown：光标离开后，语法标记隐藏，看起来像排好版的文档。
没有左右分栏预览。

## 它是什么

Inkstone 是面向 **`.md` 单文件写作** 的编辑器：

- 缓冲区里就是 Markdown 源码（CodeMirror 6）。实时预览靠装饰和 widget，
  **不是**另渲染一份 HTML 再在保存时整篇重写。
- 可在 **浏览器** 里跑（Vite，可选 PWA），也有可选的 **Tauri 2** 桌面壳。
- **无账号、无云同步、无遥测。** 文件在你磁盘上（或浏览器授权的文件句柄里）。

它 **不是** 知识库：不做双链、图谱、官方同步。那些需求请用 Obsidian 等。

## 当前已实现的功能

- 实时预览：标题、强调、链接、图片、任务列表、分隔线
- GFM 表格（对齐、编辑前隐藏分隔行）
- KaTeX：`$…$` / `$$…$$`
- Mermaid 代码块（按需加载）
- `==高亮==`、脚注、`[toc]`
- 多标签；最近文件；文件夹工作区（File System Access API）
- 粘贴图片：有工作区时写入 `assets/`，否则 data URL
- 五套主题 + 跟随系统；打字机模式；大纲
- 字体 / 字号 / 栏宽 / 自定义 CSS
- 导出：HTML、Word（`.doc`）、LaTeX、ePub 3、打印/PDF
- 界面：English / 简体中文 / 日本語
- 可选 AI（见下）

## 可选 AI（自带 Key）

**默认关闭**（设置 → AI）。填入 OpenAI 兼容接口与 Key（内置 Ollama / LM Studio 等本机预设）。

动作：润色、精简、扩写、续写、翻译、摘要、审阅。

**本版本行为：**

- 未开启时工具栏不显示 AI 入口。
- Key **默认只在内存**；可选写入 localStorage（会提示风险）。
- 每次调用都有 **发送前预览**（原文、目标、大致体积）。
- 模型输出是 **可逐条接受/拒绝的 diff**；「审阅」只出批注、不改正文。
- 发送前做本地 **敏感信息扫描**；有本地调用日志。
- 没有 Inkstone 云或中转。

## 下载

桌面安装包（Windows / macOS / Linux）：  
https://github.com/YanXu2205/Inkstone/releases

## 快速开始

```bash
git clone https://github.com/YanXu2205/Inkstone.git
cd Inkstone
npm install
npm run dev          # http://localhost:1420
```

Chrome / Edge 可原位保存；Firefox / Safari 为下载/上传回退。

### 桌面端（可选）

需要 [Rust](https://rustup.rs) 与 Tauri CLI：

```bash
npm run build
cd src-tauri && cargo tauri build
```

### 检查

```bash
npm run check
npm test             # LaTeX / ePub 导出冒烟测试
npm run build
```

## 技术栈

CodeMirror 6、KaTeX、Mermaid、markdown-it、Tauri 2（可选）。许可证：**MIT**。

## 商标

「Typora」为其权利人商标。Inkstone 为独立项目，与 Typora 无关联、无背书。
「受 Typora 启发」仅为描述性用语。

## 许可

[MIT](LICENSE) © Inkstone contributors
