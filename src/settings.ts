import { toast } from "./ai";
import { LANGUAGES, currentLang, t, type Lang } from "./i18n";

/**
 * Editor preferences: content font, size, column width and a custom
 * CSS override (the Typora power-user escape hatch).
 */

export interface Settings {
  fontFamily: string; // "" = default stack
  fontSize: number; // px
  columnWidth: number; // px
  customCss: string;
}

const KEY = "ot.settings";

const DEFAULTS: Settings = {
  fontFamily: "",
  fontSize: 15.5,
  columnWidth: 830,
  customCss: "",
};

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--font-content", s.fontFamily || "var(--font-ui)");
  root.style.setProperty("--content-size", `${s.fontSize}px`);
  root.style.setProperty("--content-width", `${s.columnWidth}px`);
  let style = document.getElementById("ot-custom-css") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "ot-custom-css";
    document.head.appendChild(style);
  }
  style.textContent = s.customCss;
}

export function buildSettingsModal(onChange: () => void): HTMLElement {
  const s = loadSettings();
  const mask = document.createElement("div");
  mask.className = "ot-modal-mask";
  const modal = document.createElement("div");
  modal.className = "ot-modal";

  const fontOptions = [
    ["", t("settings.fontDefault")],
    ["Georgia, 'Times New Roman', serif", t("settings.fontSerif")],
    ["ui-monospace, Consolas, monospace", t("settings.fontMono")],
    ["'Comic Sans MS', cursive", t("settings.fontComic")],
  ]
    .map(([v, l]) => `<option value="${v}">${l}</option>`)
    .join("");

  const langOptions = LANGUAGES.map(
    (l) => `<option value="${l.id}"${l.id === currentLang ? " selected" : ""}>${l.label}</option>`,
  ).join("");

  modal.innerHTML = `
    <h3>⚙ ${t("settings.title")}</h3>
    <label>${t("settings.language")}</label>
    <select data-k="lang" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-side);color:var(--fg)">
      ${langOptions}
    </select>
    <label>${t("settings.font")}</label>
    <select data-k="fontFamily" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-side);color:var(--fg)">
      ${fontOptions}
    </select>
    <label>${t("settings.fontSize")} — <span data-v="fontSize"></span> px</label>
    <input data-k="fontSize" type="range" min="13" max="21" step="0.5" value="${s.fontSize}">
    <label>${t("settings.colWidth")} — <span data-v="columnWidth"></span> px</label>
    <input data-k="columnWidth" type="range" min="600" max="1100" step="10" value="${s.columnWidth}">
    <label>${t("settings.customCss")} <span style="opacity:.6">${t("settings.customCssHint")}</span></label>
    <textarea data-k="customCss" rows="5" spellcheck="false"
      style="width:100%;font-family:var(--font-mono);font-size:12px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-side);color:var(--fg);resize:vertical">${s.customCss
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</textarea>
    <div class="ot-modal-actions">
      <button class="ot-btn" data-act="reset">${t("settings.reset")}</button>
      <button class="ot-btn primary" data-act="save">${t("settings.save")}</button>
    </div>`;

  const sel = modal.querySelector<HTMLSelectElement>("select[data-k=fontFamily]")!;
  sel.value = s.fontFamily;
  const sizeV = modal.querySelector<HTMLElement>('[data-v="fontSize"]')!;
  const widthV = modal.querySelector<HTMLElement>('[data-v="columnWidth"]')!;
  const sizeR = modal.querySelector<HTMLInputElement>('input[data-k="fontSize"]')!;
  const widthR = modal.querySelector<HTMLInputElement>('input[data-k="columnWidth"]')!;
  sizeV.textContent = String(s.fontSize);
  widthV.textContent = String(s.columnWidth);
  sizeR.addEventListener("input", () => (sizeV.textContent = sizeR.value));
  widthR.addEventListener("input", () => (widthV.textContent = widthR.value));

  modal.querySelector(".ot-modal-actions")!.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    if (btn.dataset.act === "reset") {
      saveSettings({ ...DEFAULTS });
      applySettings({ ...DEFAULTS });
      toast(t("settings.resetDone"));
    } else {
      const next: Settings = {
        fontFamily: sel.value,
        fontSize: Number(sizeR.value),
        columnWidth: Number(widthR.value),
        customCss:
          modal.querySelector<HTMLTextAreaElement>("textarea[data-k=customCss]")!.value,
      };
      saveSettings(next);
      applySettings(next);
      toast(t("settings.saved"));
      const langSel = modal.querySelector<HTMLSelectElement>("select[data-k=lang]")!;
      if (langSel.value !== currentLang) {
        localStorage.setItem("ot.lang", langSel.value as Lang);
        setTimeout(() => location.reload(), 400);
        return;
      }
    }
    mask.remove();
    onChange();
  });

  mask.appendChild(modal);
  mask.addEventListener("click", (e) => {
    if (e.target === mask) mask.remove();
  });
  return mask;
}
