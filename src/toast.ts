let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string): void {
  document.querySelectorAll(".ot-toast").forEach((el) => el.remove());
  clearTimeout(timer);
  const el = document.createElement("div");
  el.className = "ot-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  timer = setTimeout(() => el.remove(), 2600);
}
