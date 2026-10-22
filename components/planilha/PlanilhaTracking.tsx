// Utilidades de rastreio no navegador (só chame dentro de efeitos e cliques).
export const uid = (prefixo: string) => {
  const c = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null;
  const id = c ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return `${prefixo}_${id}`;
};

let clickId = "";
/** Um id por visita: vai pro checkout (sck/src) e volta no webhook de compra. */
export function getClickId() {
  if (!clickId) clickId = uid("pl");
  return clickId;
}

function cookie(nome: string) {
  const par = document.cookie.split("; ").find((c) => c.startsWith(nome + "="));
  return par ? decodeURIComponent(par.split("=").slice(1).join("=")) : undefined;
}
export const getFbp = () => cookie("_fbp");
export function getFbc() {
  const c = cookie("_fbc");
  if (c) return c;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined; // formato oficial da Meta
}

/** Manda o mesmo evento para o servidor (CAPI), com o mesmo eventId do navegador. */
export function enviarCapi(evento: string, eventId: string, clickIdParaSalvar?: string) {
  try {
    fetch("/api/capi/planilha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        evento,
        eventId,
        url: window.location.href,
        fbp: getFbp(),
        fbc: getFbc(),
        clickId: clickIdParaSalvar,
      }),
    }).catch(() => {});
  } catch {
    /* rastreio nunca pode quebrar a página */
  }
}
