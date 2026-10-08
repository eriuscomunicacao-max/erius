import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planejar, type EventoAsaas, type Chave } from "./assinatura-regras";

async function acharEmpresa(admin: SupabaseClient, por: Chave): Promise<string | null> {
  if (por.subscription) {
    const { data } = await admin.from("assinaturas").select("empresa_id").eq("asaas_subscription_id", por.subscription).maybeSingle();
    if (data) return data.empresa_id as string;
  }
  if (por.customer) {
    const { data } = await admin.from("assinaturas").select("empresa_id").eq("asaas_customer_id", por.customer).maybeSingle();
    if (data) return data.empresa_id as string;
  }
  return null;
}

/** Aplica um evento da Asaas. Idempotente: receber o mesmo evento 2x não muda o resultado. */
export async function aplicarEvento(admin: SupabaseClient, ev: EventoAsaas, agora = new Date()) {
  const plano = planejar(ev, agora);
  if (!plano) return { ok: true, ignorado: true };
  const empresa = await acharEmpresa(admin, plano.por);
  if (!empresa) return { ok: true, semEmpresa: true }; // evento de cobrança que não é nossa
  const t = () => admin.from("assinaturas");
  const agoraIso = agora.toISOString();

  let erro: { message: string } | null = null;
  switch (plano.acao) {
    case "pago": {
      // só avança a data (nunca recua) e marca como ativo
      const r1 = await t().update({ pago_ate: plano.pagoAte, status: "ativo" }).eq("empresa_id", empresa).or(`pago_ate.is.null,pago_ate.lt.${plano.pagoAte}`);
      erro = r1.error;
      break;
    }
    case "vencido": {
      const r = await t().update({ status: "vencido" }).eq("empresa_id", empresa).or(`pago_ate.is.null,pago_ate.lt.${agoraIso}`);
      erro = r.error;
      break;
    }
    case "estorno": {
      // só revoga se o acesso atual vem desta cobrança (não de uma mais recente)
      const r = await t().update({ pago_ate: agoraIso, status: "vencido" }).eq("empresa_id", empresa).lte("pago_ate", plano.coberturaAte);
      erro = r.error;
      break;
    }
    case "cancelado": {
      // acesso continua até o fim do período já pago
      const r = await t().update({ status: "cancelado" }).eq("empresa_id", empresa);
      erro = r.error;
      break;
    }
  }
  if (erro) throw new Error(erro.message);
  return { ok: true, acao: plano.acao };
}
