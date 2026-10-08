"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { adminDb } from "@/lib/supabase-admin";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { estadoDe } from "@/lib/assinatura-regras";
import { extrasNecessarios } from "@/lib/assentos";
import { situacaoEquipe, ajustarAssentos } from "@/lib/equipe";

const voltar = (m: string): never => redirect(`/equipe?erro=${encodeURIComponent(m)}`);
const ok = (m: string): never => redirect(`/equipe?ok=${encodeURIComponent(m)}`);

async function exigirDono() {
  const emp = await getEmpresa();
  if ((await meuPapel()) !== "dono") redirect("/producao");
  return emp;
}

async function reajustar(empresaId: string) {
  try {
    const s = await situacaoEquipe(empresaId);
    await ajustarAssentos(empresaId, extrasNecessarios(s.equipe, s.pendentes));
  } catch (e) {
    console.error("reajustar assentos:", e); // a próxima visita à tela Equipe tenta de novo
  }
}

export async function convidarFuncionario(fd: FormData) {
  const emp = await exigirDono();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  if (!nome) return voltar("Informe o nome do funcionário.");

  const { equipe, pendentes, a } = await situacaoEquipe(emp.id);
  const precisa = extrasNecessarios(equipe, pendentes + 1);
  if (precisa > (a?.assentos_extra ?? 0)) {
    // vaga adicional = +1 mensalidade. Só com assinatura ativa (o 1º funcionário já está incluso, inclusive no teste).
    if (!a || estadoDe(a) !== "ativo" || !a.asaas_subscription_id) {
      return voltar("O 1º funcionário já está incluso. Para adicionar mais, ative a assinatura primeiro.");
    }
    try {
      await ajustarAssentos(emp.id, precisa);
    } catch (e) {
      console.error("convidar/ajustar:", e);
      return voltar("Não foi possível atualizar a cobrança agora. Tente de novo em instantes.");
    }
  }
  const { error } = await adminDb().from("convites").insert({ empresa_id: emp.id, nome });
  if (error) {
    console.error("convidar/insert:", error.message);
    return voltar("Não foi possível criar o convite.");
  }
  revalidatePath("/equipe");
  return ok("Convite criado. Copie o link e envie para o funcionário.");
}

export async function cancelarConvite(fd: FormData) {
  const emp = await exigirDono();
  const { error } = await db().from("convites").delete().eq("id", String(fd.get("id")));
  if (error) return voltar("Não foi possível cancelar o convite.");
  await reajustar(emp.id);
  revalidatePath("/equipe");
  return ok("Convite cancelado.");
}

export async function removerFuncionario(fd: FormData) {
  const emp = await exigirDono();
  const { error } = await db().rpc("remover_membro", { p_user: String(fd.get("id")) });
  if (error) return voltar("Não foi possível remover o funcionário.");
  await reajustar(emp.id);
  revalidatePath("/equipe");
  return ok("Funcionário removido. O acesso dele foi encerrado.");
}
