import { EditorView, WidgetType } from "@codemirror/view";

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
