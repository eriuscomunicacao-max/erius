"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { CATEGORIAS_GASTO } from "@/lib/constants";
import { hoje } from "@/lib/format";

const TIPOS = ["comum", "reposicao", "trafego"];
// "Impostos (DAS)" tem tratamento próprio (reserva separada), por isso não entra nos envelopes
const CATS_OK: string[] = CATEGORIAS_GASTO.filter((c) => c !== "Impostos (DAS)");

// A sugestão que toda conta nova recebe (o cliente pode voltar a ela quando quiser)
const SUGESTAO = [
  { nome: "Material", pct: 30, categoria: "Material", extras: [] as string[], tipo: "reposicao", ordem: 1 },
  { nome: "Tráfego", pct: 20, categoria: "Anúncios (Ads)", extras: [] as string[], tipo: "trafego", ordem: 2 },
  { nome: "Pró-labore", pct: 30, categoria: "Pró-labore", extras: [] as string[], tipo: "comum", ordem: 3 },
  { nome: "Caixa da empresa", pct: 20, categoria: "Caixa da empresa", extras: ["Contas fixas", "Parcelas de equipamento"], tipo: "comum", ordem: 4 },
];

function valor(v: FormDataEntryValue | null) {
  let s = String(v ?? "").trim().replace(/[R$\s%]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const x = Number(s);
  return isFinite(x) ? x : 0;
}
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};
async function run(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}
const voltar = (m: string): never => redirect(`/config?erro=${encodeURIComponent(m)}#assessor`);
const ok = (m: string): never => redirect(`/config?ok=${encodeURIComponent(m)}#assessor`);
function tudo() {
  ["/", "/assessor", "/gastos", "/fluxo", "/config", "/relatorio"].forEach((p) => revalidatePath(p));
}
async function exigirDono() {
  await getEmpresa();
  if ((await meuPapel()) !== "dono") redirect("/producao");
}

type Dados = { nome: string; pct: number; categoria: string; extras: string[]; tipo: string };

/** Lê os campos de um envelope. Devolve os dados ou um texto de erro. */
function ler(fd: FormData, suf: string, principalAtual = ""): Dados | string {
  const nome = (txt(fd.get(`nome_${suf}`)) ?? "").slice(0, 40);
  if (!nome) return "Dê um nome a todos os envelopes.";
  const pct = Math.min(100, Math.max(0, valor(fd.get(`pct_${suf}`))));
  const cats = fd.getAll(`cats_${suf}`).map(String).filter((c) => CATS_OK.includes(c));
  if (!cats.length) return `Escolha pelo menos uma categoria de gasto para o envelope "${nome}".`;
  // mantém a categoria principal de antes (ela é usada nas retiradas); senão, a primeira marcada
  const categoria = cats.includes(principalAtual) ? principalAtual : cats[0];
  const tipo = TIPOS.includes(String(fd.get(`tipo_${suf}`))) ? String(fd.get(`tipo_${suf}`)) : "comum";
  return { nome, pct, categoria, extras: cats.filter((c) => c !== categoria), tipo };
}

export async function salvarAssessor(fd: FormData) {
  await exigirDono();
  const s = db();
  const empId = (await getEmpresa()).id;

  const itens: { id?: string; d: Dados }[] = [];
  for (const id of fd.getAll("env_id").map(String)) {
    const r = ler(fd, id, String(fd.get(`principal_${id}`) ?? ""));
    if (typeof r === "string") return voltar(r);
    itens.push({ id, d: r });
  }
  if (txt(fd.get("nome_novo"))) {
    const r = ler(fd, "novo");
    if (typeof r === "string") return voltar(r);
    itens.push({ d: r });
  }

  // cada categoria de gasto só pode alimentar um envelope (senão o mesmo gasto contaria duas vezes)
  const dono = new Map<string, string>();
  for (const { d } of itens) {
    for (const c of [d.categoria, ...d.extras]) {
      if (dono.has(c)) return voltar(`A categoria "${c}" está em dois envelopes ("${dono.get(c)}" e "${d.nome}"). Cada categoria só pode ficar em um.`);
      dono.set(c, d.nome);
    }
  }
  if (itens.filter((i) => i.d.tipo === "trafego").length > 1) return voltar("Só um envelope pode ser o de anúncios (retorno do tráfego).");

  for (const { id, d } of itens) {
    if (id) await run(s.from("envelopes").update({ nome: d.nome, pct: d.pct, categoria: d.categoria, extras: d.extras, tipo: d.tipo }).eq("id", id));
  }
  const novo = itens.find((i) => !i.id);
  if (novo) {
    const { data: ult } = await s.from("envelopes").select("ordem").order("ordem", { ascending: false }).limit(1);
    await run(s.from("envelopes").insert({ ...novo.d, ordem: Number(ult?.[0]?.ordem ?? 0) + 1 }));
  }

  await run(
    s.from("config").update({
      das_mensal: valor(fd.get("das_mensal")),
      assessor_inicio: txt(fd.get("assessor_inicio")) ?? hoje(),
    }).eq("empresa_id", empId)
  );
  tudo();
  return ok("Meu Assessor salvo.");
}

export async function excluirEnvelope(fd: FormData) {
  await exigirDono();
  const id = String(fd.get("excluir") ?? "");
  if (!id) return voltar("Envelope não encontrado.");
  await run(db().from("envelopes").delete().eq("id", id));
  tudo();
  return ok("Envelope removido. Os gastos lançados continuam salvos.");
}

export async function restaurarSugestaoAssessor() {
  await exigirDono();
  const s = db();
  const { data } = await s.from("envelopes").select("id");
  const ids = (data ?? []).map((e) => e.id as string);
  if (ids.length) await run(s.from("envelopes").delete().in("id", ids));
  await run(s.from("envelopes").insert(SUGESTAO));
  tudo();
  return ok("Voltamos à sugestão: Material 30%, Tráfego 20%, Pró-labore 30% e Caixa 20%.");
}
