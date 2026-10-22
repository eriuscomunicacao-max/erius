import "server-only";
import { createHash } from "crypto";

// Mesmo Pixel de components/MetaPixel.tsx (não dá pra importar de lá: aquele arquivo é "use client").
export const PIXEL_ID = "1365761865397737"; 
const GRAPH = process.env.META_GRAPH_VERSION ?? "v23.0";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
const so = (v?: string | null) => (v ?? "").replace(/\D/g, "");

export type UserData = {
  email?: string | null;
  phone?: string | null;
  nome?: string | null;
  cpf?: string | null;
  ip?: string | null;   // IP real do comprador (do clique), nunca o IP do servidor da Cakto
  ua?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type EventoCapi = {
  nome: string;                       // "Purchase", "InitiateCheckout", "ViewContent"
  eventId: string;                    // mesmo id do navegador = a Meta conta 1 vez só
  url?: string;
  time?: number;                      // segundos (padrão: agora)
  user: UserData;
  custom?: Record<string, unknown>;
};

function montarUser(u: UserData) {
  const partes = norm(u.nome).split(/\s+/).filter(Boolean);
  let tel = so(u.phone);
  if (tel.length === 10 || tel.length === 11) tel = "55" + tel; // DDI do Brasil
  const cpf = so(u.cpf);
  const out: Record<string, unknown> = {};
  if (norm(u.email)) out.em = [sha(norm(u.email))];
  if (tel) out.ph = [sha(tel)];
  if (partes[0]) out.fn = [sha(partes[0])];
  if (partes.length > 1) out.ln = [sha(partes[partes.length - 1])];
  if (cpf) out.external_id = [sha(cpf)];
  else if (norm(u.email)) out.external_id = [sha(norm(u.email))];
  out.country = [sha("br")];
  if (u.ip) out.client_ip_address = u.ip;       // não vai com hash
  if (u.ua) out.client_user_agent = u.ua;       // não vai com hash
  if (u.fbp) out.fbp = u.fbp;                   // não vai com hash
  if (u.fbc) out.fbc = u.fbc;                   // não vai com hash
  return out;
}

export async function enviarCapi(e: EventoCapi) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) throw new Error("Configure META_CAPI_TOKEN nas variáveis de ambiente (somente servidor).");
  const corpo: Record<string, unknown> = {
    data: [
      {
        event_name: e.nome,
        event_time: e.time ?? Math.floor(Date.now() / 1000),
        event_id: e.eventId,
        action_source: "website",
        event_source_url: e.url,
        user_data: montarUser(e.user),
        custom_data: e.custom ?? {},
      },
    ],
  };
  // Aba "Testar eventos" do Gerenciador de Eventos: coloque o código em META_TEST_EVENT_CODE e tire depois
  if (process.env.META_TEST_EVENT_CODE) corpo.test_event_code = process.env.META_TEST_EVENT_CODE;

  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Meta CAPI ${res.status}: ${txt.slice(0, 400)}`);
  return txt;
}
