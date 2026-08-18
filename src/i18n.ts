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

import { K } from "./storage";

const LANG_KEY = K.lang;

const en: Record<string, string> = {
  "topbar.toggleOutline": "Toggle outline (Ctrl+\\)",
  "topbar.aiSettings": "AI settings",
  "topbar.export": "Export / Print",
  "topbar.theme": "Theme",
  "topbar.palette": "Command palette (Ctrl+Shift+P)",
  "topbar.source": "Toggle source mode (Ctrl+/)",
  "topbar.focus": "Focus mode",
  "palette.title": "Command palette",
  "palette.placeholder": "Type a command…",
  "palette.empty": "No matching commands",
  "status.modeSource": "Source",
  "status.modeFocus": "Focus",
  "toast.sourceOn": "Source mode on",
  "toast.sourceOff": "Live preview on",
  "toast.focusOn": "Focus mode on",
  "toast.focusOff": "Focus mode off",
  "cmd.open": "Open file",
  "cmd.save": "Save",
  "cmd.newTab": "New tab",
  "cmd.toggleSidebar": "Toggle sidebar",
  "cmd.toggleSource": "Toggle source mode",
  "cmd.toggleFocus": "Toggle focus mode",
  "cmd.toggleTypewriter": "Toggle typewriter mode",
  "cmd.exportHtml": "Export HTML",
  "cmd.exportPdf": "Print / PDF",
  "cmd.settings": "Settings",
  "cmd.ai": "AI settings",
  "cmd.theme": "Theme: {0}",
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
  "settings.docTheme": "Document theme",
  "settings.docThemeHint": "Typora-compatible CSS layered on the editor. Import a .css file or pick a bundled one.",
  "settings.importTheme": "Import CSS…",
  "settings.themeImported": "Theme imported: {0}",
  "settings.customCss": "Custom CSS",
  "settings.customCssHint": "(applied on top of everything)",
  "settings.ai": "AI copilot…",
  "settings.reset": "Reset",
  "settings.save": "Save",
  "settings.saved": "Preferences saved",
  "settings.resetDone": "Preferences reset",
};

const zhCN: Record<string, string> = {
  "topbar.toggleOutline": "切换大纲 (Ctrl+\\)",
  "topbar.aiSettings": "AI 设置",
  "topbar.export": "导出 / 打印",
  "topbar.theme": "主题",
  "topbar.palette": "命令面板（Ctrl+Shift+P）",
  "topbar.source": "切换源码模式（Ctrl+/）",
  "topbar.focus": "专注模式",
  "palette.title": "命令面板",
  "palette.placeholder": "输入命令…",
  "palette.empty": "没有匹配的命令",
  "status.modeSource": "源码",
  "status.modeFocus": "专注",
  "toast.sourceOn": "已切换到源码模式",
  "toast.sourceOff": "已恢复实时预览",
  "toast.focusOn": "专注模式已开启",
  "toast.focusOff": "专注模式已关闭",
  "cmd.open": "打开文件",
  "cmd.save": "保存",
  "cmd.newTab": "新建标签",
  "cmd.toggleSidebar": "切换侧栏",
  "cmd.toggleSource": "切换源码模式",
  "cmd.toggleFocus": "切换专注模式",
  "cmd.toggleTypewriter": "切换打字机模式",
  "cmd.exportHtml": "导出 HTML",
  "cmd.exportPdf": "打印 / PDF",
  "cmd.settings": "设置",
  "cmd.ai": "AI 设置",
  "cmd.theme": "主题：{0}",
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
  "settings.docTheme": "文档主题",
  "settings.docThemeHint": "叠加在编辑区上的 Typora 兼容 CSS。可导入 .css 或选内置主题。",
  "settings.importTheme": "导入 CSS…",
  "settings.themeImported": "已导入主题：{0}",
  "settings.customCss": "自定义 CSS",
  "settings.customCssHint": "（叠加在所有样式之上）",
  "settings.ai": "AI 副驾…",
  "settings.reset": "重置",
  "settings.save": "保存",
  "settings.saved": "偏好已保存",
  "settings.resetDone": "偏好已重置",
};

const ja: Record<string, string> = {
  "topbar.toggleOutline": "アウトライン切替 (Ctrl+\\)",
  "topbar.aiSettings": "AI 設定",
  "topbar.export": "エクスポート / 印刷",
  "topbar.theme": "テーマ",
  "topbar.palette": "コマンドパレット (Ctrl+Shift+P)",
  "topbar.source": "ソースモード切替 (Ctrl+/)",
  "topbar.focus": "フォーカスモード",
  "palette.title": "コマンドパレット",
  "palette.placeholder": "コマンドを入力…",
  "palette.empty": "一致するコマンドがありません",
  "status.modeSource": "ソース",
  "status.modeFocus": "フォーカス",
  "toast.sourceOn": "ソースモード",
  "toast.sourceOff": "ライブプレビュー",
  "toast.focusOn": "フォーカスモード on",
  "toast.focusOff": "フォーカスモード off",
  "cmd.open": "ファイルを開く",
  "cmd.save": "保存",
  "cmd.newTab": "新しいタブ",
  "cmd.toggleSidebar": "サイドバー切替",
  "cmd.toggleSource": "ソースモード切替",
  "cmd.toggleFocus": "フォーカスモード切替",
  "cmd.toggleTypewriter": "タイプライターモード切替",
  "cmd.exportHtml": "HTML を書き出す",
  "cmd.exportPdf": "印刷 / PDF",
  "cmd.settings": "設定",
  "cmd.ai": "AI 設定",
  "cmd.theme": "テーマ: {0}",
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
  "settings.docTheme": "文書テーマ",
  "settings.docThemeHint": "編集領域に重ねる Typora 互換 CSS。ファイルを取り込むか同梱テーマを選べます。",
  "settings.importTheme": "CSS を取り込む…",
  "settings.themeImported": "テーマを取り込みました: {0}",
  "settings.customCss": "カスタム CSS",
  "settings.customCssHint": "（すべてのスタイルに上書き）",
  "settings.ai": "AI コパイロット…",
  "settings.reset": "リセット",
  "settings.save": "保存",
  "settings.saved": "設定を保存しました",
  "settings.resetDone": "設定をリセットしました",
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

/** Lazily-loaded features register their own strings instead of bloating this file. */
export function addMessages(extra: Partial<Record<Lang, Record<string, string>>>): void {
  for (const lang of Object.keys(extra) as Lang[]) {
    const table = extra[lang];
    if (table) Object.assign(MESSAGES[lang], table);
  }
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
