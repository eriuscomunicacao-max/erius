import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cobrancasDaAssinatura } from "./asaas";
import { aplicarEvento } from "./assinatura-webhook";

const PAGOS = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

/**
 * Pergunta à Asaas (com a nossa chave) se já existe cobrança paga e, se sim, libera o acesso
 * pelo mesmo caminho do webhook. Serve de rede de segurança caso o webhook demore.
 */
export async function confirmarPagamentoNaAsaas(
  admin: SupabaseClient,
  a: { asaas_customer_id: string | null; asaas_subscription_id: string | null },
) {
  if (!a.asaas_subscription_id) return false;
  const lista = await cobrancasDaAssinatura(a.asaas_subscription_id);
  const paga = lista
    .filter((c) => PAGOS.includes(c.status))
    .sort((x, y) => String(y.dueDate).localeCompare(String(x.dueDate)))[0];
  if (!paga) return false;
  await aplicarEvento(admin, {
    event: "PAYMENT_RECEIVED",
    payment: { id: paga.id, customer: a.asaas_customer_id ?? undefined, subscription: a.asaas_subscription_id, dueDate: paga.dueDate },
  });
  return true;
}
