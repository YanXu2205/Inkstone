import { t } from "../i18n";
import { diffLines, hunkStats, applyHunks, type Hunk } from "./diff";
import { redact, type Finding } from "./scan";
import { button, checkbox, choose, note, openModal } from "./modal";
import { estimateTokens } from "./provider";

/** Set once per session by the "don't ask again" checkbox — never persisted. */
let skipPreviewThisSession = false;

export interface SendInfo {
  actionLabel: string;
  destination: string;
  model: string;
  text: string;
  whole: boolean;
}

export async function confirmSend(info: SendInfo): Promise<boolean> {
  if (skipPreviewThisSession) return true;

  let skip = false;
  const picked = await choose(
    t("ai.preview.title"),
    (body) => {
      body.appendChild(note(t("ai.preview.meta", info.destination, info.model)));
      if (info.whole) body.appendChild(note(t("ai.preview.wholeDoc"), "warn"));
      body.appendChild(
        note(t("ai.preview.size", info.text.length, estimateTokens(info.text))),
      );
      body.appendChild(note(t("ai.preview.body")));

      const pre = document.createElement("pre");
      pre.className = "ot-send-preview";
      pre.textContent = info.text;
      body.appendChild(pre);

      const box = checkbox(t("ai.preview.skip"), false);
      box.input.addEventListener("change", () => {
        skip = box.input.checked;
      });
      body.appendChild(box.row);
    },
    [{ id: "send", label: t("ai.preview.send"), primary: true }],
    true,
  );

  if (picked === "send" && skip) skipPreviewThisSession = true;
  return picked === "send";
}

export function confirmSecrets(
  findings: Finding[],
  destination: string,
): Promise<"cancel" | "redacted" | "anyway"> {
  const kinds = [...new Set(findings.map((f) => f.kind))].join(", ");
  return choose(
    t("ai.scan.title"),
    (body) => {
      body.appendChild(note(t("ai.scan.body", `${findings.length} × ${kinds}`, destination), "warn"));
      const list = document.createElement("ul");
      list.className = "ot-log";
      for (const f of findings) {
        const li = document.createElement("li");
        li.textContent = `${f.line}:${f.column} · ${f.kind} · ${f.excerpt}`;
        list.appendChild(li);
      }
      body.appendChild(list);
    },
    [
      { id: "redacted", label: t("ai.scan.redacted"), primary: true },
      { id: "anyway", label: t("ai.scan.anyway"), danger: true },
    ],
  ).then((picked) => (picked === "redacted" || picked === "anyway" ? picked : "cancel"));
}

export { redact };

/**
 * Show the model's rewrite as a reviewable diff. Resolves to the text the
 * user accepted, or null when nothing should be applied.
 */
export function reviewDiff(before: string, after: string): Promise<string | null> {
  const hunks = diffLines(before, after);
  const changed = hunks
    .map((h, i) => [h, i] as const)
    .filter(([h]) => h.kind !== "same");

  if (!changed.length) {
    return choose(t("ai.diff.title"), (body) => body.appendChild(note(t("ai.diff.none"))), []).then(
      () => null,
    );
  }

  return new Promise((resolve) => {
    const modal = openModal(t("ai.diff.title"), true);
    const stats = hunkStats(hunks);
    modal.body.appendChild(
      note(t("ai.diff.stats", stats.added, stats.removed, stats.changed)),
    );

    const accepted = new Set<number>(changed.map(([, i]) => i));
    const boxes: HTMLInputElement[] = [];

    changed.forEach(([hunk, index], n) => {
      const block = document.createElement("div");
      block.className = "ot-hunk";

      const box = checkbox(t("ai.diff.hunk", n + 1), true);
      box.input.addEventListener("change", () => {
        if (box.input.checked) accepted.add(index);
        else accepted.delete(index);
        refreshApply();
      });
      boxes.push(box.input);
      block.appendChild(box.row);
      block.appendChild(renderHunk(hunk));
      modal.body.appendChild(block);
    });

    const apply = button("", {
      primary: true,
      onClick: () => {
        result = applyHunks(before, hunks, accepted);
        modal.close();
      },
    });
    function refreshApply() {
      apply.textContent = t("ai.diff.apply", `${accepted.size}/${changed.length}`);
      apply.disabled = accepted.size === 0;
    }
    refreshApply();

    let result: string | null = null;
    modal.footer.append(
      button(t("ai.diff.rejectAll"), {
        onClick: () => {
          accepted.clear();
          for (const b of boxes) b.checked = false;
          refreshApply();
        },
      }),
      button(t("ai.diff.acceptAll"), {
        onClick: () => {
          changed.forEach(([, i]) => accepted.add(i));
          for (const b of boxes) b.checked = true;
          refreshApply();
        },
      }),
      button(t("ai.cancel"), { onClick: () => modal.close() }),
      apply,
    );
    modal.onClose(() => resolve(result));
  });
}

function renderHunk(hunk: Hunk): HTMLElement {
  const pre = document.createElement("pre");
  pre.className = "ot-diff";
  for (const line of hunk.oldLines) {
    const row = document.createElement("span");
    row.className = "ot-diff-del";
    row.textContent = `- ${line}\n`;
    pre.appendChild(row);
  }
  for (const line of hunk.newLines) {
    const row = document.createElement("span");
    row.className = "ot-diff-add";
    row.textContent = `+ ${line}\n`;
    pre.appendChild(row);
  }
  return pre;
}

/** Review comments are model output: shown as text, never rendered as HTML. */
export function showComments(text: string): void {
  const modal = openModal(t("ai.review.title"), true);
  modal.body.appendChild(note(t("ai.review.hint")));
  const pre = document.createElement("pre");
  pre.className = "ot-comments";
  pre.textContent = text;
  modal.body.appendChild(pre);
  modal.footer.appendChild(button(t("ai.close"), { primary: true, onClick: () => modal.close() }));
}
