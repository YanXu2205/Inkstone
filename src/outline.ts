import type { EditorView } from "@codemirror/view";
import { EditorView as EV } from "@codemirror/view";

export interface Heading {
  level: number;
  text: string;
  pos: number;
}

/** Extract ATX headings, skipping fenced code blocks. */
export function extractHeadings(doc: string): Heading[] {
  const headings: Heading[] = [];
  let pos = 0;
  let inFence = false;

  for (const line of doc.split("\n")) {
    const fence = /^\s*(```|~~~)/.test(line);
    if (fence) inFence = !inFence;
    if (!inFence) {
      const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (m) {
        headings.push({
          level: m[1].length,
          text: m[2] || "(untitled)",
          pos,
        });
      }
    }
    pos += line.length + 1;
  }
  return headings;
}

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
    empty.textContent = "No headings yet — start with #";
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
