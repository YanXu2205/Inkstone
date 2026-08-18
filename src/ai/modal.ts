import { t } from "../i18n";

/** Small DOM helpers shared by the AI dialogs. Text only — never innerHTML. */

export interface Modal {
  root: HTMLElement;
  panel: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  close(): void;
  onClose(fn: () => void): void;
}

export function openModal(title: string, wide = false): Modal {
  const root = document.createElement("div");
  root.className = "ot-modal-mask";

  const panel = document.createElement("div");
  panel.className = wide ? "ot-modal ot-modal-wide" : "ot-modal";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", title);

  const heading = document.createElement("h3");
  heading.textContent = title;
  panel.appendChild(heading);

  const body = document.createElement("div");
  body.className = "ot-modal-body";
  panel.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "ot-modal-actions";
  panel.appendChild(footer);

  root.appendChild(panel);
  document.body.appendChild(root);

  const closers: (() => void)[] = [];
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    root.remove();
    for (const fn of closers) fn();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener("keydown", onKey, true);
  root.addEventListener("mousedown", (e) => {
    if (e.target === root) close();
  });

  return { root, panel, body, footer, close, onClose: (fn) => closers.push(fn) };
}

export function button(
  label: string,
  opts: { primary?: boolean; danger?: boolean; onClick?: () => void } = {},
): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "ot-btn" + (opts.primary ? " primary" : "") + (opts.danger ? " danger" : "");
  b.textContent = label;
  if (opts.onClick) b.addEventListener("click", opts.onClick);
  return b;
}

export function labelled(text: string, control: HTMLElement, hint?: string): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "ot-field";
  const span = document.createElement("span");
  span.className = "ot-field-label";
  span.textContent = text;
  wrap.append(span, control);
  if (hint) {
    const small = document.createElement("small");
    small.className = "ot-field-hint";
    small.textContent = hint;
    wrap.appendChild(small);
  }
  return wrap;
}

export function checkbox(text: string, checked: boolean): {
  row: HTMLElement;
  input: HTMLInputElement;
} {
  const row = document.createElement("label");
  row.className = "ot-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  const span = document.createElement("span");
  span.textContent = text;
  row.append(input, span);
  return { row, input };
}

export function note(text: string, tone: "warn" | "info" = "info"): HTMLElement {
  const el = document.createElement("p");
  el.className = tone === "warn" ? "ot-note ot-note-warn" : "ot-note";
  el.textContent = text;
  return el;
}

/** A modal that resolves to the id of the chosen button, or null when dismissed. */
export function choose(
  title: string,
  build: (body: HTMLElement) => void,
  choices: { id: string; label: string; primary?: boolean; danger?: boolean }[],
  wide = false,
): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = openModal(title, wide);
    build(modal.body);
    let picked: string | null = null;
    modal.footer.appendChild(
      button(t("ai.cancel"), {
        onClick: () => modal.close(),
      }),
    );
    for (const choice of choices) {
      modal.footer.appendChild(
        button(choice.label, {
          primary: choice.primary,
          danger: choice.danger,
          onClick: () => {
            picked = choice.id;
            modal.close();
          },
        }),
      );
    }
    modal.onClose(() => resolve(picked));
  });
}
