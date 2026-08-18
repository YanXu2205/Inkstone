import type { EditorView } from "@codemirror/view";
import { EditorView as EV } from "@codemirror/view";
import { t } from "./i18n";
import type { Heading } from "./editor/headings";

export { extractHeadings, type Heading } from "./editor/headings";

export function renderOutline(
  headings: Heading[],
  container: HTMLElement,
  view: EditorView,
  activePos: number,
) {
  container.textContent = "";
  if (!headings.length) {
    const empty = document.createElement("div");
    empty.className = "ot-outline-empty";
    empty.textContent = t("outline.empty");
    container.appendChild(empty);
    return;
  }

  let activeIdx = -1;
  headings.forEach((h, i) => {
    if (h.pos <= activePos) activeIdx = i;
  });

  headings.forEach((h, i) => {
    const btn = document.createElement("button");
    btn.className = "ot-outline-item" + (i === activeIdx ? " active" : "");
    btn.style.paddingLeft = `${10 + (h.level - 1) * 13}px`;
    btn.textContent = h.text;
    btn.title = h.text;
    btn.onclick = () => {
      view.dispatch({
        selection: { anchor: h.pos },
        effects: EV.scrollIntoView(h.pos, { y: "center" }),
      });
      view.focus();
    };
    container.appendChild(btn);
  });
}
