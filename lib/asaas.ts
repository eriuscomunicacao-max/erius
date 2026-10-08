import "server-only";

const BASE =
  process.env.ASAAS_BASE_URL ??
  (process.env.ASAAS_ENV === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");

export class AsaasErro extends Error {
  constructor(public status: number, public corpo: unknown) {
    super(`Asaas respondeu ${status}`);
  }
  /** Mensagem amigável vinda da API, quando houver. */
  get detalhe() {
    const e = (this.corpo as { errors?: { description?: string }[] })?.errors;
    return e?.map((x) => x.description).filter(Boolean).join(" ") || `erro ${this.status}`;
  }
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("Configure ASAAS_API_KEY nas variáveis de ambiente.");
  const res = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "OrcaGrafica/1.0 (Next.js)", // obrigatório em contas Asaas novas
      access_token: key,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new AsaasErro(res.status, json);
  return json as T;
}

export const criarCliente = (d: { name: string; email: string; cpfCnpj: string; externalReference: string }) =>
  chamar<{ id: string }>("POST", "/customers", d);

export async function criarAssinatura(d: {
  customer: string; value: number; nextDueDate: string; description: string; externalReference: string;
}) {
  const base = { ...d, cycle: "MONTHLY" };
  const tipo = process.env.ASAAS_BILLING_TYPE ?? "UNDEFINED"; // UNDEFINED = cliente escolhe Pix, boleto ou cartão
  try {
    return await chamar<{ id: string }>("POST", "/subscriptions", { ...base, billingType: tipo });
  } catch (e) {
    // Se a conta não aceitar "cliente escolhe", cai para Pix para não travar a venda
    if (e instanceof AsaasErro && e.status === 400 && tipo === "UNDEFINED") {
      return chamar<{ id: string }>("POST", "/subscriptions", { ...base, billingType: "PIX" });
    }
    throw e;
  }
}

type Cobranca = { id: string; status: string; invoiceUrl?: string; dueDate?: string };

export async function cobrancasDaAssinatura(id: string) {
  const r = await chamar<{ data: Cobranca[] }>("GET", `/subscriptions/${encodeURIComponent(id)}/payments?limit=10`);
  return r.data ?? [];
}

/** Link da cobrança em aberto (a mais antiga pendente/vencida). Tenta de novo se a 1ª ainda não foi gerada. */
export async function linkDaCobrancaEmAberto(subscriptionId: string) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const lista = await cobrancasDaAssinatura(subscriptionId);
    const aberta = lista
      .filter((c) => (c.status === "PENDING" || c.status === "OVERDUE") && c.invoiceUrl)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
    if (aberta?.invoiceUrl) return aberta.invoiceUrl;
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

export const cancelarAssinatura = (id: string) => chamar<{ deleted?: boolean }>("DELETE", `/subscriptions/${encodeURIComponent(id)}`);
