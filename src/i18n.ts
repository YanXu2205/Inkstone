/**
 * Minimal i18n: flat key → string maps with {0}/{1} placeholders.
 * Languages are plain objects — adding one is just adding a file entry.
 */

export type Lang = "en" | "zh-CN" | "ja";

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "zh-CN", label: "简体中文" },
  { id: "ja", label: "日本語" },
];

const LANG_KEY = "ot.lang";

const en: Record<string, string> = {
  "topbar.toggleOutline": "Toggle outline (Ctrl+\\)",
  "topbar.aiSettings": "AI settings",
  "topbar.export": "Export / Print",
  "topbar.theme": "Theme",
  "topbar.settings": "Editor preferences",
  "topbar.typewriter": "Typewriter mode",
  "sidebar.files": "Files",
  "sidebar.recent": "Recent",
  "sidebar.outline": "Outline",
  "sidebar.openFolder": "Open folder as workspace",
  "sidebar.newFile": "New file in workspace",
  "sidebar.refresh": "Refresh tree",
  "sidebar.recentEmpty": "Ctrl+O to open a file",
  "sidebar.reconnect": "🔓 Reconnect {0}",
  "outline.empty": "No headings yet — start with #",
  "status.words": "{0} words · {1} chars",
  "status.lineCol": "Ln {0}, Col {1}",
  "status.mode": "Markdown · Live Preview",
  "status.modeTypewriter": "Markdown · Live Preview · Typewriter",
  "menu.exportHtml": "📄 Export HTML",
  "menu.exportWord": "📝 Export Word (.doc)",
  "menu.exportLatex": "🧪 Export LaTeX (.tex)",
  "menu.exportEpub": "📚 Export ePub (.epub)",
  "menu.printPdf": "🖨 Print / PDF",
  "theme.auto": "Auto (system)",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.solarized": "Solarized",
  "theme.nord": "Nord",
  "theme.dracula": "Dracula",
  "common.on": "on",
  "common.off": "off",
  "common.close": "Close",
  "tabs.newTab": "New tab (welcome doc)",
  "toast.saved": "Saved {0}",
  "toast.opened": "Opened {0}",
  "toast.themeSet": "Theme: {0}",
  "toast.typewriter": "Typewriter mode: {0}",
  "toast.permissionDenied": "Permission denied",
  "toast.reopenFailed": "Could not reopen {0}",
  "toast.openFailed": "Could not open {0}",
  "toast.imageSaved": "Image saved to {0}",
  "toast.createFailed": "Could not create file",
  "confirm.closeDirty": "Close {0} with unsaved changes?",
  "toast.aiKeyMissing": "Set your API key first (✨ button)",
  "toast.aiNothing": "Nothing to work on",
  "toast.aiDone": "Done — Ctrl+Z to undo",
  "toast.aiFailed": "AI failed: {0}",
  "toast.aiRunning": "AI {0}… (may take a few seconds)",
  "toast.aiSettingsSaved": "AI settings saved",
  "toast.wsConnected": "Workspace: {0}",
  "ws.newFileName": "New file name",
  "settings.title": "Editor preferences",
  "settings.language": "Language / 语言",
  "settings.font": "Content font",
  "settings.fontDefault": "System (default)",
  "settings.fontSerif": "Serif",
  "settings.fontMono": "Monospace",
  "settings.fontComic": "Comic Sans 😏",
  "settings.fontSize": "Font size",
  "settings.colWidth": "Column width",
  "settings.customCss": "Custom CSS",
  "settings.customCssHint": "(applied on top of everything)",
  "settings.reset": "Reset",
  "settings.save": "Save",
  "settings.saved": "Preferences saved",
  "settings.resetDone": "Preferences reset",
  "ai.title": "AI Assist",
  "ai.subtitle": "bring your own key",
  "ai.baseUrl": "API Base URL",
  "ai.baseUrlHint": "(any OpenAI-compatible endpoint)",
  "ai.apiKey": "API Key",
  "ai.apiKeyHint": "(stored only in this browser)",
  "ai.model": "Model",
  "ai.action.polish": "✨ Polish",
  "ai.action.translate": "文A Translate",
  "ai.action.summarize": "≡ Summarize",
};

const zhCN: Record<string, string> = {
  "topbar.toggleOutline": "切换大纲 (Ctrl+\\)",
  "topbar.aiSettings": "AI 设置",
  "topbar.export": "导出 / 打印",
  "topbar.theme": "主题",
  "topbar.settings": "编辑偏好",
  "topbar.typewriter": "打字机模式",
  "sidebar.files": "文件",
  "sidebar.recent": "最近文件",
  "sidebar.outline": "大纲",
  "sidebar.openFolder": "打开文件夹作为工作区",
  "sidebar.newFile": "在工作区新建文件",
  "sidebar.refresh": "刷新文件树",
  "sidebar.recentEmpty": "Ctrl+O 打开文件",
  "sidebar.reconnect": "🔓 重新连接 {0}",
  "outline.empty": "还没有标题 —— 从 # 开始",
  "status.words": "{0} 字 · {1} 字符",
  "status.lineCol": "第 {1} 行，第 {0} 列",
  "status.mode": "Markdown · 实时预览",
  "status.modeTypewriter": "Markdown · 实时预览 · 打字机",
  "menu.exportHtml": "📄 导出 HTML",
  "menu.exportWord": "📝 导出 Word (.doc)",
  "menu.exportLatex": "🧪 导出 LaTeX (.tex)",
  "menu.exportEpub": "📚 导出 ePub (.epub)",
  "menu.printPdf": "🖨 打印 / PDF",
  "theme.auto": "自动（跟随系统）",
  "theme.light": "浅色",
  "theme.dark": "深色",
  "theme.solarized": "Solarized",
  "theme.nord": "Nord",
  "theme.dracula": "Dracula",
  "common.on": "开",
  "common.off": "关",
  "common.close": "关闭",
  "tabs.newTab": "新建标签（欢迎文档）",
  "toast.saved": "已保存 {0}",
  "toast.opened": "已打开 {0}",
  "toast.themeSet": "主题：{0}",
  "toast.typewriter": "打字机模式：{0}",
  "toast.permissionDenied": "权限被拒绝",
  "toast.reopenFailed": "无法重新打开 {0}",
  "toast.openFailed": "无法打开 {0}",
  "toast.imageSaved": "图片已保存到 {0}",
  "toast.createFailed": "无法创建文件",
  "confirm.closeDirty": "关闭 {0}？未保存的修改将丢失",
  "toast.aiKeyMissing": "请先设置 API Key（✨ 按钮）",
  "toast.aiNothing": "没有可处理的文本",
  "toast.aiDone": "完成 —— Ctrl+Z 可撤销",
  "toast.aiFailed": "AI 出错：{0}",
  "toast.aiRunning": "AI {0}…（可能需要几秒）",
  "toast.aiSettingsSaved": "AI 设置已保存",
  "toast.wsConnected": "工作区：{0}",
  "ws.newFileName": "新文件名",
  "settings.title": "编辑偏好",
  "settings.language": "Language / 语言",
  "settings.font": "正文字体",
  "settings.fontDefault": "系统默认",
  "settings.fontSerif": "衬线字体",
  "settings.fontMono": "等宽字体",
  "settings.fontComic": "Comic Sans 😏",
  "settings.fontSize": "字号",
  "settings.colWidth": "栏宽",
  "settings.customCss": "自定义 CSS",
  "settings.customCssHint": "（叠加在所有样式之上）",
  "settings.reset": "重置",
  "settings.save": "保存",
  "settings.saved": "偏好已保存",
  "settings.resetDone": "偏好已重置",
  "ai.title": "AI 助手",
  "ai.subtitle": "自带 API Key",
  "ai.baseUrl": "API 地址",
  "ai.baseUrlHint": "（任何 OpenAI 兼容接口）",
  "ai.apiKey": "API Key",
  "ai.apiKeyHint": "（仅存储在本浏览器）",
  "ai.model": "模型",
  "ai.action.polish": "✨ 润色",
  "ai.action.translate": "文A 翻译",
  "ai.action.summarize": "≡ 总结",
};

const ja: Record<string, string> = {
  "topbar.toggleOutline": "アウトライン切替 (Ctrl+\\)",
  "topbar.aiSettings": "AI 設定",
  "topbar.export": "エクスポート / 印刷",
  "topbar.theme": "テーマ",
  "topbar.settings": "エディター設定",
  "topbar.typewriter": "タイプライターモード",
  "sidebar.files": "ファイル",
  "sidebar.recent": "最近のファイル",
  "sidebar.outline": "アウトライン",
  "sidebar.openFolder": "フォルダーをワークスペースとして開く",
  "sidebar.newFile": "新規ファイル作成",
  "sidebar.refresh": "ツリーを更新",
  "sidebar.recentEmpty": "Ctrl+O でファイルを開く",
  "sidebar.reconnect": "🔓 再接続 {0}",
  "outline.empty": "見出しがありません — # から始めましょう",
  "status.words": "{0} 語 · {1} 文字",
  "status.lineCol": "{1} 行 {0} 桁",
  "status.mode": "Markdown · ライブプレビュー",
  "status.modeTypewriter": "Markdown · ライブプレビュー · タイプライター",
  "menu.exportHtml": "📄 HTML エクスポート",
  "menu.exportWord": "📝 Word エクスポート (.doc)",
  "menu.exportLatex": "🧪 LaTeX エクスポート (.tex)",
  "menu.exportEpub": "📚 ePub エクスポート (.epub)",
  "menu.printPdf": "🖨 印刷 / PDF",
  "theme.auto": "自動（システムに従う）",
  "theme.light": "ライト",
  "theme.dark": "ダーク",
  "theme.solarized": "Solarized",
  "theme.nord": "Nord",
  "theme.dracula": "Dracula",
  "common.on": "オン",
  "common.off": "オフ",
  "common.close": "閉じる",
  "tabs.newTab": "新規タブ（ウェルカム）",
  "toast.saved": "{0} を保存しました",
  "toast.opened": "{0} を開きました",
  "toast.themeSet": "テーマ：{0}",
  "toast.typewriter": "タイプライターモード：{0}",
  "toast.permissionDenied": "アクセスが拒否されました",
  "toast.reopenFailed": "{0} を再開できません",
  "toast.openFailed": "{0} を開けません",
  "toast.imageSaved": "画像を {0} に保存しました",
  "toast.createFailed": "ファイルを作成できません",
  "confirm.closeDirty": "{0} を閉じますか？未保存の変更は失われます",
  "toast.aiKeyMissing": "先に API キーを設定してください（✨ ボタン）",
  "toast.aiNothing": "対象となるテキストがありません",
  "toast.aiDone": "完了 — Ctrl+Z で元に戻せます",
  "toast.aiFailed": "AI エラー：{0}",
  "toast.aiRunning": "AI {0}…（数秒かかります）",
  "toast.aiSettingsSaved": "AI 設定を保存しました",
  "toast.wsConnected": "ワークスペース：{0}",
  "ws.newFileName": "新規ファイル名",
  "settings.title": "エディター設定",
  "settings.language": "Language / 言語",
  "settings.font": "本文のフォント",
  "settings.fontDefault": "システム（デフォルト）",
  "settings.fontSerif": "セリフ",
  "settings.fontMono": "等幅",
  "settings.fontComic": "Comic Sans 😏",
  "settings.fontSize": "フォントサイズ",
  "settings.colWidth": "行の幅",
  "settings.customCss": "カスタム CSS",
  "settings.customCssHint": "（すべてのスタイルに上書き）",
  "settings.reset": "リセット",
  "settings.save": "保存",
  "settings.saved": "設定を保存しました",
  "settings.resetDone": "設定をリセットしました",
  "ai.title": "AI アシスト",
  "ai.subtitle": "API キー持ち込み",
  "ai.baseUrl": "API ベース URL",
  "ai.baseUrlHint": "（OpenAI 互換エンドポイント）",
  "ai.apiKey": "API キー",
  "ai.apiKeyHint": "（このブラウザにのみ保存）",
  "ai.model": "モデル",
  "ai.action.polish": "✨ 推敲",
  "ai.action.translate": "文A 翻訳",
  "ai.action.summarize": "≡ 要約",
};

const MESSAGES: Record<Lang, Record<string, string>> = {
  en,
  "zh-CN": zhCN,
  ja,
};

export let currentLang: Lang = "en";

export function detectLang(): Lang {
  // ?lang= deep link (also used by tests) > saved > browser > en
  const url = new URLSearchParams(location.search).get("lang");
  if (url && url in MESSAGES) return url as Lang;
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && saved in MESSAGES) return saved as Lang;
  const nav = navigator.language;
  if (nav.startsWith("zh")) return "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  return "en";
}

export function initLang(): void {
  currentLang = detectLang();
  localStorage.setItem(LANG_KEY, currentLang);
  document.documentElement.lang = currentLang;
  applyStatic();
}

export function t(key: string, ...args: (string | number)[]): string {
  const table = MESSAGES[currentLang] ?? en;
  let s = table[key] ?? en[key] ?? key;
  args.forEach((a, i) => {
    s = s.replaceAll(`{${i}}`, String(a));
  });
  return s;
}

/** Apply translations to static HTML marked with data-i18n / data-i18n-title. */
export function applyStatic(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  });
}
