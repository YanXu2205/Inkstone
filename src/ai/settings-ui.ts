import { t } from "../i18n";
import { toast } from "../toast";
import {
  PRESETS,
  endpointHost,
  isLocalEndpoint,
  loadConfig,
  saveConfig,
  type AIConfig,
  type ContextMode,
  type ProviderKind,
} from "./config";
import { clearKey, getKey, setKey } from "./secrets";
import { clearLog, readLog } from "./log";
import { button, checkbox, labelled, note, openModal } from "./modal";

export function openSettings(onChanged?: () => void): void {
  const config = loadConfig();
  const modal = openModal(t("ai.title"));

  modal.body.appendChild(note(t("ai.subtitle")));

  const enable = checkbox(t("ai.enable"), config.enabled);
  modal.body.append(enable.row, note(t("ai.enableHint")));

  const endpoint = document.createElement("input");
  endpoint.value = config.baseUrl;
  endpoint.spellcheck = false;

  const model = document.createElement("input");
  model.value = config.model;
  model.spellcheck = false;

  const kind = document.createElement("select");
  for (const [value, label] of [
    ["openai", "OpenAI-compatible"],
    ["anthropic", "Anthropic Messages"],
  ] as const) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    kind.appendChild(opt);
  }
  kind.value = config.kind;

  const badge = document.createElement("span");
  badge.className = "ot-badge";
  const refreshBadge = () => {
    const local = isLocalEndpoint(endpoint.value);
    badge.textContent = local ? t("ai.badgeLocal") : t("ai.badgeCloud");
    badge.classList.toggle("local", local);
  };
  endpoint.addEventListener("input", refreshBadge);
  refreshBadge();

  const presets = document.createElement("div");
  presets.className = "ot-preset-row";
  for (const preset of PRESETS) {
    presets.appendChild(
      button(preset.label, {
        onClick: () => {
          endpoint.value = preset.baseUrl;
          model.value = preset.model;
          kind.value = preset.kind;
          refreshBadge();
        },
      }),
    );
  }

  const key = document.createElement("input");
  key.type = "password";
  key.value = getKey();
  key.spellcheck = false;
  key.placeholder = "sk-…";
  key.autocomplete = "off";

  const persist = checkbox(t("ai.persist"), config.persistKey);

  const context = document.createElement("select");
  for (const mode of ["selection", "block", "document"] as ContextMode[]) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = t(`ai.ctx.${mode}`);
    context.appendChild(opt);
  }
  context.value = config.contextMode;

  const endpointRow = document.createElement("div");
  endpointRow.className = "ot-endpoint-row";
  endpointRow.append(endpoint, badge);

  modal.body.append(
    presets,
    labelled(t("ai.provider"), kind),
    labelled(t("ai.endpoint"), endpointRow),
    labelled(t("ai.model"), model),
    labelled(
      t("ai.apiKey"),
      key,
      isLocalEndpoint(endpoint.value) ? t("ai.keyHintLocal") : t("ai.keyHintSession"),
    ),
    persist.row,
    note(t("ai.persistWarn"), "warn"),
    labelled(t("ai.context"), context),
  );

  modal.footer.append(
    button(t("ai.viewLog"), { onClick: () => openLog() }),
    button(t("ai.clearKey"), {
      danger: true,
      onClick: () => {
        clearKey();
        key.value = "";
        toast(t("ai.toast.keyForgotten"));
      },
    }),
    button(t("ai.close"), { onClick: () => modal.close() }),
    button(t("ai.save"), {
      primary: true,
      onClick: () => {
        const next: AIConfig = {
          ...config,
          enabled: enable.input.checked,
          kind: kind.value as ProviderKind,
          baseUrl: endpoint.value.trim(),
          model: model.value.trim(),
          persistKey: persist.input.checked,
          contextMode: context.value as ContextMode,
        };
        saveConfig(next);
        setKey(key.value.trim(), next.persistKey);
        toast(t("ai.toast.saved"));
        modal.close();
        onChanged?.();
      },
    }),
  );
}

export function openLog(): void {
  const modal = openModal(t("ai.log.title"), true);
  const entries = readLog();

  if (!entries.length) {
    modal.body.appendChild(note(t("ai.log.empty")));
  } else {
    const list = document.createElement("ul");
    list.className = "ot-log";
    for (const entry of entries) {
      const li = document.createElement("li");
      li.textContent = t(
        "ai.log.row",
        new Date(entry.at).toLocaleString(),
        entry.action,
        `${entry.model} @ ${entry.host}${entry.local ? " ⌂" : ""}`,
        entry.inTokens,
        entry.outTokens,
        entry.status,
      );
      list.appendChild(li);
    }
    modal.body.appendChild(list);
  }

  modal.footer.append(
    button(t("ai.log.clear"), {
      danger: true,
      onClick: () => {
        clearLog();
        modal.close();
      },
    }),
    button(t("ai.close"), { primary: true, onClick: () => modal.close() }),
  );
}

/** Destination shown in the pre-send disclosure. */
export function destination(config: AIConfig): string {
  return `${endpointHost(config.baseUrl)}${isLocalEndpoint(config.baseUrl) ? ` (${t("ai.badgeLocal")})` : ""}`;
}
