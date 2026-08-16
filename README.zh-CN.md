<div align="center">

<img src="public/icon.svg" width="96" alt="OpenTypora logo" />

# OpenTypora 中文文档

**免费、开源、本地优先的所见即所得 Markdown 编辑器。**
[Typora](https://typora.io) 与 [MarkText](https://github.com/marktext/marktext) 的社区继任者。

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)

*[English](README.md) · 简体中文*

</div>

---

![OpenTypora 浅色主题](docs/screenshot-light.png)

光标移到哪里，哪里的原始 Markdown 语法就**原地显现**；移开，它又化回漂亮的正文。没有分栏、没有预览窗口、没有开关——只有你和文字。

## 为什么做这个项目

Typora 很优秀，但**收费且闭源**；MarkText 是最受欢迎的免费替代品，却**自 2022 年起停止维护**，5 万多星的用户一直在寻找新家。OpenTypora 接过接力棒：

|                    | Typora        | MarkText        | **OpenTypora**     |
| ------------------ | ------------- | --------------- | ------------------ |
| 无缝所见即所得     | ✅            | ✅              | ✅                 |
| 价格               | 收费          | 免费            | **免费，永远**      |
| 源代码             | 闭源          | 开源（休眠）    | **开源，活跃**      |
| 本地优先           | ✅            | ✅              | ✅                 |
| 可在浏览器运行     | ❌            | ❌              | ✅                 |
| 自带 Key 的 AI     | ❌            | ❌              | ✅                 |
| 遥测               | —             | 无              | **无**              |

## 功能

- **🖱 真正的无缝实时预览** —— 标题、强调、链接、图片、任务列表、分隔线随打字渲染，语法只在光标处显现
- **🖼 内联图片** —— 剪贴板直接粘贴，data URL 全程离线
- **✅ 可交互复选框** —— 点击即切换 `- [ ]` / `- [x]`
- **📦 语法高亮代码块** + 语言标签（100+ 语言）
- **🗂 文档大纲**，点击跳转（`Ctrl+\` 开关）
- **💾 真实文件读写** —— 打开 / 保存 / 另存 `.md`；Chrome、Edge 与桌面端支持原位保存
- **📄 导出** —— 自包含样式 HTML，或打印为 PDF
- **🌙 浅色 / 深色 / 跟随系统**
- **✨ AI 助手（可选）** —— 润色、中英互译、总结，使用*你自己的* OpenAI 兼容 API Key，除你选中的文字外无任何数据离开你的机器
- **⌨️ Typora 风格快捷键** —— `Ctrl+B` / `Ctrl+I` / `Ctrl+E` / `Ctrl+K` 对当前词智能包裹，`Enter` 自动延续列表与引用，`Ctrl+S` 保存
- **📦 极小核心** —— 编辑器核心 gzip 后约 40 kB（不含语言包），浏览器中运行无需 Electron

## 快速开始

```bash
git clone https://github.com/open-typora/open-typora
cd open-typora
npm install
npm run dev          # → http://localhost:1420
```

桌面版（Tauri 2）：

```bash
npm run build
cd src-tauri && cargo tauri build
```

Windows / macOS / Linux 预编译包由 CI 发布在 [Releases](../../releases)。源码构建需要 [Rust](https://rustup.rs)。

## 实现原理

**没有第二个渲染层。** 文档永远只是一个 CodeMirror 6 缓冲区；装饰插件遍历 Lezer 语法树：

- 光标不在节点内时，用 `Decoration.replace` 折叠语法标记（`#`、`**`、`` ` ``、`>`、`](…)`）；
- 用行装饰为块级元素（标题、引用、代码围栏）上样式；
- 将图片、任务复选框、分隔线替换为交互式 widget。

光标进入某个结构时，其装饰自动让位，原始语法透出——这就是全部诀窍。因为缓冲区*就是*唯一事实来源，复制粘贴、搜索、撤销、无障碍访问 100% 不受影响。详见 [`src/editor/livePreview.ts`](src/editor/livePreview.ts)。

## 参与贡献

欢迎 Issue 与 PR——这个项目的存在，正是因为前辈们停下了脚步。

## 许可

[MIT](LICENSE) © open-typora contributors
