import { EditorView, WidgetType } from "@codemirror/view";
import katex from "katex";

/**
 * Inline image — replaces the raw `![alt](src)` syntax with the actual
 * image while the cursor is elsewhere. Clicking the image reveals the
 * raw syntax again.
 */
export class ImageWidget extends WidgetType {
  constructor(
    readonly pos: number,
    readonly src: string,
    readonly alt: string,
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return other.pos === this.pos && other.src === this.src && other.alt === this.alt;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("span");
    wrap.className = "ot-img";
    const img = document.createElement("img");
    img.alt = this.alt;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      wrap.textContent = `🖼 ${this.alt || this.src || "image"}`;
      wrap.classList.add("ot-img-broken");
    });
    img.src = this.src;
    wrap.appendChild(img);
    // Clicking an image puts the caret inside it, revealing raw markdown.
    wrap.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        e.preventDefault();
        view.dispatch({
          selection: { anchor: this.pos + 1 },
          scrollIntoView: true,
        });
      }
    });
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

/** Interactive checkbox for `- [ ]` / `- [x]` task items. */
export class TaskCheckboxWidget extends WidgetType {
  constructor(
    readonly pos: number,
    readonly checked: boolean,
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return other.pos === this.pos && other.checked === this.checked;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "ot-task";
    box.checked = this.checked;
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", () => {
      const next = this.checked ? "[ ]" : "[x]";
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: next },
      });
    });
    return box;
  }

  ignoreEvent() {
    return false;
  }
}

/** Clean horizontal rule replacing `---`. */
export class HrWidget extends WidgetType {
  constructor(readonly pos: number) {
    super();
  }

  eq(other: HrWidget) {
    return other.pos === this.pos;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = "ot-hr";
    return el;
  }

  ignoreEvent() {
    return true;
  }
}

/** Mermaid diagram replacing a ```mermaid fenced block. */
export class MermaidWidget extends WidgetType {
  private static seq = 0;
  readonly id = `ot-mermaid-${++MermaidWidget.seq}`;

  constructor(
    readonly pos: number,
    readonly code: string,
    readonly dark: boolean,
  ) {
    super();
  }

  eq(other: MermaidWidget) {
    return other.pos === this.pos && other.code === this.code && other.dark === this.dark;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("div");
    wrap.className = "ot-mermaid";
    wrap.textContent = "⏳ rendering diagram…";

    this.render(wrap).catch((e) => {
      wrap.textContent = "";
      const pre = document.createElement("pre");
      pre.className = "ot-mermaid-error";
      pre.textContent = `${this.code}\n\n— ${String((e as Error)?.message || e)}`;
      wrap.appendChild(pre);
    });

    wrap.addEventListener("mousedown", (e) => {
      if (e.button === 0 && e.offsetX < 0) {
        // clicking the left gutter reveals the raw source
        e.preventDefault();
        view.dispatch({ selection: { anchor: this.pos + 4 }, scrollIntoView: true });
      }
    });
    return wrap;
  }

  private async render(wrap: HTMLElement) {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: this.dark ? "dark" : "default",
      fontFamily: getComputedStyle(document.documentElement)
        .getPropertyValue("--font-ui")
        .trim() || undefined,
    });
    const { svg } = await mermaid.render(this.id, this.code);
    wrap.textContent = "";
    wrap.innerHTML = svg;
  }

  ignoreEvent() {
    return false;
  }
}

/** KaTeX-rendered formula; click to reveal the raw TeX. */
export class MathWidget extends WidgetType {  constructor(
    readonly pos: number,
    readonly tex: string,
    readonly display: boolean,
  ) {
    super();
  }

  eq(other: MathWidget) {
    return (
      other.pos === this.pos &&
      other.tex === this.tex &&
      other.display === this.display
    );
  }

  toDOM(view: EditorView) {
    const span = document.createElement("span");
    span.className = "ot-math" + (this.display ? " ot-math-display" : "");
    try {
      span.innerHTML = katex.renderToString(this.tex, {
        displayMode: this.display,
        throwOnError: true,
      });
    } catch {
      span.textContent = this.tex;
      span.classList.add("ot-math-error");
    }
    span.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        e.preventDefault();
        view.dispatch({
          selection: { anchor: this.pos + (this.display ? 2 : 1) },
          scrollIntoView: true,
        });
      }
    });
    return span;
  }

  ignoreEvent() {
    return false;
  }
}
