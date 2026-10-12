"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { carregarPadroes } from "@/lib/data";
import { totalItem } from "@/lib/produtos";
import { criarProduto, enviarLogo } from "./empresa-actions";

const voltar = (m: string): never => redirect(`/comecar?erro=${encodeURIComponent(m)}`);
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};
const num = (v: FormDataEntryValue | null) => {
  let s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const x = Number(s);
  return isFinite(x) && x >= 0 ? x : 0;
};
const medida = (v: number) => String(v).replace(".", ",");

async function exigirDono() {
  await getEmpresa();
  if ((await meuPapel()) !== "dono") redirect("/producao");
}

/** Passo 1: WhatsApp da empresa (obrigatório) e logo (opcional). */
export async function salvarContatoInicial(fd: FormData) {
  await exigirDono();
  const emp = await getEmpresa();
  const telefone = txt(fd.get("telefone")) ?? "";
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) return voltar("Informe o WhatsApp com DDD, por exemplo (19) 99999-9999.");

  const { error } = await db().from("empresas").update({ telefone }).eq("id", emp.id);
  if (error) return voltar("Não foi possível salvar o WhatsApp. Tente de novo.");

  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    let msg = "";
    try {
      await enviarLogo(fd);
    } catch (e) {
      msg = e instanceof Error ? e.message : "Não foi possível enviar a logo.";
    }
    if (msg) return voltar(`WhatsApp salvo, mas a logo não subiu: ${msg} Você pode enviar a logo depois, em Configurações.`);
  }
  revalidatePath("/comecar");
  redirect("/comecar");
}

/** Passo 2: primeiro produto ou serviço do catálogo. */
export async function criarPrimeiroProduto(fd: FormData) {
  await exigirDono();
  if (!txt(fd.get("nome"))) return voltar("Dê um nome ao produto ou serviço.");
  if (!(num(fd.get("preco")) > 0)) return voltar("Informe o preço (maior que zero).");
  let falhou = false;
  try {
    await criarProduto(fd);
  } catch (e) {
    console.error("comecar/produto:", e);
    falhou = true;
  }
  if (falhou) return voltar("Não foi possível salvar o produto. Tente de novo.");
  redirect("/comecar");
}

/** Passo 3: primeiro orçamento (1 item do catálogo). Ao salvar, o sistema todo é liberado. */
export async function criarPrimeiroOrcamento(fd: FormData) {
  await exigirDono();
  const s = db();
  const cliente = txt(fd.get("cliente"));
  const produtoId = String(fd.get("produto_id") ?? "");
  const qtd = Math.max(1, Math.round(num(fd.get("quantidade")) || 1));
  const larg = num(fd.get("largura"));
  const alt = num(fd.get("altura"));
  if (!cliente) return voltar("Informe o nome do cliente do orçamento.");

  const { data: p } = await s.from("produtos").select("*").eq("id", produtoId).maybeSingle();
  if (!p) return voltar("Escolha um dos seus produtos.");
  if (p.unidade === "m²" && (!larg || !alt)) return voltar("Informe a largura e a altura em metros.");

  const total = totalItem(p.unidade, Number(p.preco), qtd, larg, alt);
  const padroes = await carregarPadroes();
  const { data: orc, error } = await s
    .from("orcamentos")
    .insert({ cliente, validade_dias: padroes.validade || 15, prazo: padroes.prazo || null, pagamento: padroes.pagamento || null })
    .select("id")
    .single();
  if (error || !orc) return voltar("Não foi possível criar o orçamento. Tente de novo.");

  const { error: e2 } = await s.from("orcamento_itens").insert({
    orcamento_id: orc.id,
    tipo: "manual",
    servico: p.categoria,
    tamanho: p.unidade === "m²" ? `${medida(larg)} x ${medida(alt)} m` : null,
    quantidade: qtd,
    descricao: p.nome,
    valor_unitario: Math.round((total / qtd) * 100) / 100,
    valor_total: total,
    ordem: 0,
  });
  if (e2) {
    await s.from("orcamentos").delete().eq("id", orc.id); // não deixa orçamento vazio
    return voltar("Não foi possível salvar o item do orçamento. Tente de novo.");
  }
  revalidatePath("/orcamentos");
  revalidatePath("/");
  redirect(`/comecar?feito=${orc.id}`);
}
