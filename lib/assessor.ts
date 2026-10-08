import "server-only";
import { db } from "./supabase";
import { mesDe, somaMes, ultimoDia } from "./format";
import type { Base } from "./data";

export type Envelope = { id: string; nome: string; pct: number; categoria: string; ordem: number };

export async function carregarEnvelopes(): Promise<Envelope[] | null> {
  const { data, error } = await db().from("envelopes").select("*").order("ordem");
  if (error) return null; // tabela ainda não criada
  return (data ?? []).map((e) => ({ ...e, pct: Number(e.pct) })) as Envelope[];
}

// Categorias de gasto que têm "preço de reposição" (compra de material)
const REPOSICAO = ["Material"];

// Envelopes que também absorvem outras categorias de Gastos.
// O "Caixa da empresa" paga as contas fixas e as parcelas das máquinas.
export const CATEGORIAS_EXTRAS: Record<string, string[]> = {
  "Caixa da empresa": ["Contas fixas", "Parcelas de equipamento"],
};
export const categoriasDoEnvelope = (cat: string) => [cat, ...(CATEGORIAS_EXTRAS[cat] ?? [])];

export function montarAssessor(b: Base, envelopes: Envelope[], mes: string) {
  const inicio = b.config.assessor_inicio;
  const fim = ultimoDia(mes);
  const mesIni = mesDe(inicio);
  const das = b.config.das_mensal;
  const dentro = (d: string) => d >= inicio && d <= fim;

  // Meses do início até o mês escolhido
  const meses: string[] = [];
  for (let m = mesIni; m <= mes; m = somaMes(m, 1)) meses.push(m);

  const pags = b.pagamentos.filter((p) => dentro(p.data));
  const recMes = new Map<string, number>();
  pags.forEach((p) => recMes.set(mesDe(p.data), (recMes.get(mesDe(p.data)) ?? 0) + p.valor));

  // DAS é separado antes da divisão (até o valor recebido no mês)
  let recebido = 0, reservaDas = 0;
  meses.forEach((m) => {
    const r = recMes.get(m) ?? 0;
    recebido += r;
    reservaDas += Math.min(das, r);
  });
  const distribuivel = recebido - reservaDas;
  const recebidoMes = recMes.get(mes) ?? 0;
  const distribuivelMes = recebidoMes - Math.min(das, recebidoMes);

  const gastosPeriodo = b.gastos.filter((g) => dentro(g.data));
  const gastoCat = (cat: string, soMes = false) =>
    gastosPeriodo.filter((g) => categoriasDoEnvelope(cat).includes(g.categoria) && (!soMes || mesDe(g.data) === mes)).reduce((s, g) => s + g.valor, 0);

  // Preço de reposição = média das últimas 3 compras da categoria (qualquer data)
  const reposicao = (cat: string) => {
    if (!REPOSICAO.includes(cat)) return null;
    const ult = b.gastos.filter((g) => g.categoria === cat).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 3);
    if (!ult.length) return null;
    return { media: ult.reduce((s, g) => s + g.valor, 0) / ult.length, compras: ult.length };
  };

  const lista = envelopes.map((e) => {
    const entrou = (distribuivel * e.pct) / 100;
    const gasto = gastoCat(e.categoria);
    const saldo = entrou - gasto;
    return {
      ...e,
      entrou, gasto, saldo,
      entrouMes: (distribuivelMes * e.pct) / 100,
      gastoMes: gastoCat(e.categoria, true),
      reposicao: reposicao(e.categoria),
      ultimas: gastosPeriodo
        .filter((g) => categoriasDoEnvelope(e.categoria).includes(g.categoria))
        .sort((x, y) => y.data.localeCompare(x.data) || y.id.localeCompare(x.id))
        .slice(0, 4),
    };
  });

  // Gastos que saíram do caixa sem envelope
  const cats = new Set([...envelopes.flatMap((e) => categoriasDoEnvelope(e.categoria)), "Impostos (DAS)"]);
  const foraLista = gastosPeriodo.filter((g) => !cats.has(g.categoria));
  const fora = foraLista.reduce((s, g) => s + g.valor, 0);

  // Retorno do tráfego (ROAS): venda / gasto em anúncios
  const envTrafego = envelopes.find((e) => e.categoria === "Anúncios (Ads)");
  const vendasMes = b.pedidos.filter((p) => mesDe(p.data) === mes).reduce((s, p) => s + p.valor_total, 0);
  const vendasPeriodo = b.pedidos.filter((p) => dentro(p.data)).reduce((s, p) => s + p.valor_total, 0);
  const adsMes = gastoCat("Anúncios (Ads)", true);
  const adsPeriodo = gastoCat("Anúncios (Ads)");
  const roas = envTrafego
    ? { mes: adsMes ? vendasMes / adsMes : null, periodo: adsPeriodo ? vendasPeriodo / adsPeriodo : null, adsMes, vendasMes }
    : null;

  const somaPct = envelopes.reduce((s, e) => s + e.pct, 0);
  const dasInfo = das > 0 ? { mensal: das, reservado: reservaDas, pago: gastoCat("Impostos (DAS)"), saldo: reservaDas - gastoCat("Impostos (DAS)") } : null;

  // Caixa dos envelopes: o que entrou menos o que já foi retirado
  const retirado = lista.reduce((t, e) => t + e.gasto, 0);
  const retiradoMes = lista.reduce((t, e) => t + e.gastoMes, 0);
  const emCaixa = lista.reduce((t, e) => t + e.saldo, 0) + (dasInfo ? dasInfo.saldo : 0);

  return {
    inicio, antesDoInicio: mes < mesIni,
    retirado, retiradoMes, emCaixa,
    recebido, recebidoMes, distribuivel, reservaDas,
    envelopes: lista, fora, foraLista, roas, somaPct, das: dasInfo,
  };
}
