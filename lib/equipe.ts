import "server-only";
import { adminDb } from "./supabase-admin";
import { atualizarValorAssinatura } from "./asaas";
import { precoDoPlano } from "./assinatura";
import { valorMensal } from "./assentos";
import type { Assinatura } from "./assinatura-regras";

/** Quantos funcionários, convites pendentes e a assinatura da empresa (lido pelo servidor). */
export async function situacaoEquipe(empresaId: string) {
  const admin = adminDb();
  const [eq, pe, as] = await Promise.all([
    admin.from("membros").select("*", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("papel", "equipe"),
    admin.from("convites").select("*", { count: "exact", head: true }).eq("empresa_id", empresaId).is("usado_em", null).gt("expira_em", new Date().toISOString()),
    admin.from("assinaturas").select("*").eq("empresa_id", empresaId).maybeSingle(),
  ]);
  return { equipe: eq.count ?? 0, pendentes: pe.count ?? 0, a: (as.data as Assinatura | null) ?? null };
}

/** Ajusta as vagas pagas e o valor da assinatura na Asaas. Asaas primeiro; se falhar, o banco não muda. */
export async function ajustarAssentos(empresaId: string, desejado: number) {
  const admin = adminDb();
  const { data } = await admin.from("assinaturas").select("*").eq("empresa_id", empresaId).maybeSingle();
  const a = data as Assinatura | null;
  if (!a || (a.assentos_extra ?? 0) === desejado) return;
  if (a.asaas_subscription_id && a.status !== "cancelado") {
    await atualizarValorAssinatura(a.asaas_subscription_id, valorMensal(precoDoPlano(), desejado));
  }
  const { error } = await admin.from("assinaturas").update({ assentos_extra: desejado }).eq("empresa_id", empresaId);
  if (error) throw new Error(error.message);
}
