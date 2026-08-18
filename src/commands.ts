import { t } from "./i18n";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/**
 * Fuzzy-filterable command palette (Ctrl+Shift+P). Built fresh each open so
 * labels always reflect the current language and dynamic state.
 */
export function openCommandPalette(commands: Command[]): void {
  document.querySelector(".ot-palette-mask")?.remove();

  const mask = document.createElement("div");
  mask.className = "ot-palette-mask";
  const panel = document.createElement("div");
  panel.className = "ot-palette";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("palette.title"));

  const input = document.createElement("input");
  input.className = "ot-palette-input";
  input.placeholder = t("palette.placeholder");
  input.spellcheck = false;
  input.autocomplete = "off";

  const list = document.createElement("div");
  list.className = "ot-palette-list";
  list.setAttribute("role", "listbox");

  panel.append(input, list);
  mask.appendChild(panel);
  document.body.appendChild(mask);

  let filtered = commands.slice();
  let active = 0;

  const close = () => {
    document.removeEventListener("keydown", onDocKey, true);
    mask.remove();
  };

  const render = () => {
    list.textContent = "";
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "ot-palette-empty";
      empty.textContent = t("palette.empty");
      list.appendChild(empty);
      return;
    }
    filtered.forEach((cmd, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "ot-palette-item" + (i === active ? " active" : "");
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", i === active ? "true" : "false");
      const label = document.createElement("span");
      label.className = "ot-palette-label";
      label.textContent = cmd.label;
      row.appendChild(label);
      if (cmd.hint) {
        const hint = document.createElement("span");
        hint.className = "ot-palette-hint";
        hint.textContent = cmd.hint;
        row.appendChild(hint);
      }
      row.addEventListener("mouseenter", () => {
        active = i;
        render();
      });
      row.addEventListener("click", () => {
        close();
        cmd.run();
      });
      list.appendChild(row);
    });
    list.querySelector(".ot-palette-item.active")?.scrollIntoView({ block: "nearest" });
  };

  const applyFilter = () => {
    const q = input.value.trim().toLowerCase();
    filtered = !q
      ? commands.slice()
      : commands.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            (c.hint && c.hint.toLowerCase().includes(q)),
        );
    active = 0;
    render();
  };

  const runActive = () => {
    const cmd = filtered[active];
    if (!cmd) return;
    close();
    cmd.run();
  };

  const onDocKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };
  document.addEventListener("keydown", onDocKey, true);

  input.addEventListener("input", applyFilter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, Math.max(0, filtered.length - 1));
      render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      render();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    }
  });

  mask.addEventListener("mousedown", (e) => {
    if (e.target === mask) close();
  });

  applyFilter();
  queueMicrotask(() => input.focus());
}
