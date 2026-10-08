"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { adminDb } from "@/lib/supabase-admin";
import { getEmpresa } from "@/lib/empresa";
import { getAssinatura, precoDoPlano } from "@/lib/assinatura";
import { primeiroVencimento } from "@/lib/assinatura-regras";
import { AsaasErro, criarCliente, criarAssinatura, linkDaCobrancaEmAberto, cancelarAssinatura } from "@/lib/asaas";

const voltar = (msg: string): never => redirect(`/assinatura?erro=${encodeURIComponent(msg)}`);

/** Valida CPF (11) ou CNPJ (14) pelos dígitos verificadores. */
function documentoValido(d: string) {
  if (!/^\d+$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dig = (base: string, pesos: number[]) => {
    const s = base.split("").reduce((t, n, i) => t + Number(n) * pesos[i], 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (d.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    return dig(d.slice(0, 9), p1) === Number(d[9]) && dig(d.slice(0, 10), p2) === Number(d[10]);
  }
  if (d.length === 14) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    return dig(d.slice(0, 12), p1) === Number(d[12]) && dig(d.slice(0, 13), p2) === Number(d[13]);
  }
  return false;
}

export async function iniciarAssinatura(fd: FormData) {
  const emp = await getEmpresa();
  const a = await getAssinatura();
  if (!a) return voltar("Assinatura não encontrada. Saia e entre de novo.");

  const nome = String(fd.get("nome") ?? "").trim() || emp.nome;
  const email = String(fd.get("email") ?? "").trim();
  const doc = String(fd.get("cpf_cnpj") ?? "").replace(/\D/g, "");
  if (!email.includes("@")) return voltar("Informe um e-mail válido.");
  if (!documentoValido(doc)) return voltar("CPF ou CNPJ inválido. Confira os números.");

  let link: string | null = null;
  try {
    const admin = adminDb();
    let customerId = a.asaas_customer_id;
    if (!customerId) {
      customerId = (await criarCliente({ name: nome, email, cpfCnpj: doc, externalReference: emp.id })).id;
      await admin.from("assinaturas").update({ asaas_customer_id: customerId }).eq("empresa_id", emp.id);
    }
    let subId = a.asaas_subscription_id;
    if (!subId || a.status === "cancelado") {
      subId = (
        await criarAssinatura({
          customer: customerId,
          value: precoDoPlano(),
          nextDueDate: primeiroVencimento(a.trial_ate),
          description: "Assinatura OrçaGrafica",
          externalReference: emp.id,
        })
      ).id;
      await admin.from("assinaturas").update({ asaas_subscription_id: subId, status: a.status === "cancelado" ? "vencido" : a.status }).eq("empresa_id", emp.id);
    }
    link = await linkDaCobrancaEmAberto(subId);
  } catch (e) {
    console.error("iniciarAssinatura:", e);
        return voltar(`Não foi possível criar a cobrança: ${e instanceof AsaasErro ? e.detalhe : e instanceof Error ? e.message.slice(0, 160) : "erro desconhecido"}`);
  }
  if (!link) return voltar("A cobrança foi criada, mas o link ainda não ficou pronto. Clique em \"Ver cobrança em aberto\" em instantes.");
  redirect(link);
}

export async function abrirCobranca() {
  await getEmpresa();
  const a = await getAssinatura();
  if (!a?.asaas_subscription_id) return voltar("Você ainda não tem uma assinatura.");
  let link: string | null = null;
  try {
    link = await linkDaCobrancaEmAberto(a.asaas_subscription_id);
  } catch (e) {
    console.error("abrirCobranca:", e);
    return voltar("Não foi possível buscar a cobrança agora.");
  }
  if (!link) return voltar("Nenhuma cobrança em aberto no momento.");
  redirect(link);
}

export async function cancelarMinhaAssinatura() {
  const emp = await getEmpresa();
  const a = await getAssinatura();
  if (!a?.asaas_subscription_id) return voltar("Você não tem assinatura ativa.");
  try {
    await cancelarAssinatura(a.asaas_subscription_id);
    await adminDb().from("assinaturas").update({ status: "cancelado" }).eq("empresa_id", emp.id);
  } catch (e) {
    console.error("cancelar:", e);
    return voltar("Não foi possível cancelar agora. Tente de novo em instantes.");
  }
  revalidatePath("/assinatura");
  redirect("/assinatura?ok=" + encodeURIComponent("Assinatura cancelada. Você continua com acesso até o fim do período já pago."));
}

export async function sairDaTelaAssinatura() {
  await db().auth.signOut();
  redirect("/login");
}
