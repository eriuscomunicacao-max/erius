// Regras puras da assinatura (sem acesso a banco/rede) — fáceis de testar.

export type Estado = "gratis" | "ativo" | "trial" | "expirado";

export type Assinatura = {
  empresa_id: string;
  status: string;
  trial_ate: string;
  pago_ate: string | null;
  acesso_gratis: boolean;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  assentos_extra?: number;
};

/** Mesma regra do banco (função acesso_liberado): grátis > pago > teste > expirado. */
export function estadoDe(a: Pick<Assinatura, "acesso_gratis" | "pago_ate" | "trial_ate">, agora = new Date()): Estado {
  if (a.acesso_gratis) return "gratis";
  if (a.pago_ate && new Date(a.pago_ate) > agora) return "ativo";
  if (new Date(a.trial_ate) > agora) return "trial";
  return "expirado";
}

export const diasRestantes = (iso: string, agora = new Date()) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - agora.getTime()) / 86_400_000));

/** Data (YYYY-MM-DD) no fuso de Brasília. */
export const dataBrasilia = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(d);

/** Primeiro vencimento: no fim do teste (se ainda em teste) ou hoje. */
export function primeiroVencimento(trialAte: string, agora = new Date()) {
  const hoje = dataBrasilia(agora);
  const fimTeste = dataBrasilia(new Date(trialAte));
  return new Date(trialAte) > agora && fimTeste > hoje ? fimTeste : hoje;
}

/* ---------------- Webhook da Asaas ---------------- */
export const CARENCIA_DIAS = 3;

export type EventoAsaas = {
  event?: string;
  payment?: { id?: string; customer?: string; subscription?: string; dueDate?: string };
  subscription?: { id?: string; customer?: string };
};

export type Plano =
  | { acao: "pago"; por: Chave; pagoAte: string }
  | { acao: "estorno"; por: Chave; coberturaAte: string }
  | { acao: "vencido"; por: Chave }
  | { acao: "cancelado"; por: Chave };
export type Chave = { subscription?: string; customer?: string };

/** Soma 1 mês sem estourar o dia (31/01 → 28/02). */
export function maisUmMes(d: Date) {
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, d.getUTCHours()));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d.getUTCDate(), ultimo));
  return alvo;
}

/** Até quando uma cobrança paga cobre o uso: vencimento + 1 mês + carência. */
export function coberturaDaCobranca(dueDate: string | undefined, agora = new Date()) {
  const venc = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? new Date(`${dueDate}T12:00:00Z`) : agora;
  const base = venc > agora ? venc : agora;
  const fim = maisUmMes(base);
  fim.setUTCDate(fim.getUTCDate() + CARENCIA_DIAS);
  return fim.toISOString();
}

export function planejar(ev: EventoAsaas, agora = new Date()): Plano | null {
  const p = ev.payment;
  const porPagamento: Chave = { subscription: p?.subscription, customer: p?.customer };
  switch (ev.event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      if (!p) return null;
      return { acao: "pago", por: porPagamento, pagoAte: coberturaDaCobranca(p.dueDate, agora) };
    case "PAYMENT_OVERDUE":
      return p ? { acao: "vencido", por: porPagamento } : null;
    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
      return p ? { acao: "estorno", por: porPagamento, coberturaAte: coberturaDaCobranca(p.dueDate, agora) } : null;
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
      return ev.subscription?.id ? { acao: "cancelado", por: { subscription: ev.subscription.id } } : null;
    default:
      return null;
  }
}
