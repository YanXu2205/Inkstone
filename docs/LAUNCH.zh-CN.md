# Inkstone（砚）：一个不改你文件的开源 Markdown 编辑器

> 给写作者和开发者的一版说明。不谈「颠覆」，只谈它实际做了什么。

## 先说结论

**Inkstone** 是一个免费、开源、本地优先的所见即所得 Markdown 编辑器。  
受 Typora 启发，但和 Typora **没有**任何官方关系。

它解决的核心问题很具体：

1. 写 Markdown 时想直接看到排版，而不是左右分栏。  
2. 保存之后，**没改过的段落不要被编辑器重排**，git diff 保持干净。  
3. AI 可以有，但必须默认关闭、自带 Key、改文前能预览、结果可逐条接受。

仓库：https://github.com/YanXu2205/Inkstone  
安装包：https://github.com/YanXu2205/Inkstone/releases  

---

## 背景（为什么还要做一个）

Typora 把「输入即渲染」做成了标杆，但 1.0 后收费且闭源。  
MarkText 曾是很强的开源替代，如今仍有维护，但技术债重（Electron + 老前端栈 + 大量历史 issue）。

Inkstone **不打算**复刻成「开源版 Typora」——那既有商标风险，也没有差异化。  
它选择守住「单文件写作器」这条线，并在三件事上做清楚：

| 承诺 | 含义 |
| --- | --- |
| 你的字节属于你 | 文档本体就是 Markdown；保存不整篇重序列化 |
| 本地优先 | 无账号、无云同步、无遥测 |
| 可选 AI | 默认关；自带 Key；diff 建议，不静默覆盖 |

---

## 你打开后能直接用的

- 无缝实时预览（CodeMirror 6 装饰，不是第二套 HTML 预览）
- 表格、任务列表、脚注、`==高亮==`、`[toc]`
- KaTeX 公式、Mermaid 图（按需加载）
- 多标签、最近文件、文件夹工作区
- 五套界面主题 + **文档主题**（可导入 Typora 风格 `.css`）
- 导出 HTML / Word / LaTeX / ePub / 打印 PDF
- 界面：English / 简体中文 / 日本語
- Windows / macOS / Linux 安装包（GitHub Releases）

浏览器里也可以：

```bash
git clone https://github.com/YanXu2205/Inkstone.git
cd Inkstone
npm install
npm run dev
```

---

## AI：按你的规矩来

设置 → AI 里开启。支持 OpenAI 兼容接口，也有 Ollama、LM Studio 等本机预设。

当前动作：润色、精简、扩写、续写、翻译、摘要、审阅。

硬规则（写在产品里，不是口号）：

1. **默认关闭**，不开就不加载入口。  
2. **Key 默认只在内存**；若写入浏览器本地存储会明确警告。  
3. **发送前预览**：你能看到将发出的原文、目标主机、大致体积。  
4. **结果是 diff**：逐条接受/拒绝；「审阅」只出批注、不改正文。  
5. **本地敏感信息扫描** + 本地调用日志。  

没有 Inkstone 云，也没有官方模型中转。

---

## 明确不做的事

写在仓库的 `NON_GOALS.md` 里，避免需求把项目拖成笔记操作系统：

- 不做云同步 / 账号体系  
- 不做双链图谱（最多兼容解析 `[[wiki-link]]` 语法）  
- 1.0 前不做实时协作  
- 永不做遥测、不做强制联网  

---

## 许可

- 应用整体：**AGPL-3.0-or-later**（防止被闭源打包成商业壳）  
- 编辑器核心 `src/editor/**`：**MIT**（方便别人嵌入）  

详见 `LICENSES.md`。

---

## 适合谁

- 用 git 管文档、讨厌编辑器污染 diff 的人  
- 想要 Typora 手感、又希望完全本地与开源的人  
- 需要偶尔 AI 润色、但不想默认把稿件送进黑盒的人  

不适合：要双链知识库、团队实时共编、官方云笔记的人——那些该用别的工具。

---

## 一句话

**Inkstone = 本地 Markdown 写作器 + 不乱动你的文件 + 可选且可审计的 AI。**

下载与源码：https://github.com/YanXu2205/Inkstone  

（文中事实以当前 Release 为准；功能以仓库 README 为准。）
