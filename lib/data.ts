import "server-only";
import { db } from "./supabase";
import { mesDe, somaMes, mesCurto } from "./format";
import { LIMITES, NAO_DESPESA } from "./constants";

export type Pedido = {
  id: string; cliente: string; servico: string; descricao: string | null; quantidade: number;
  data: string; prioridade: boolean; valor_base: number; adicional_prioridade: number;
  valor_total: number; forma_pagto: string | null; observacoes: string | null;
};
export type Pagamento = { id: string; pedido_id: string; data: string; valor: number; forma: string | null };
export type Gasto = {
  id: string; data: string; descricao: string; categoria: string; parcela_atual: number | null;
  parcela_total: number | null; valor: number; observacoes: string | null;
};
export type Fixa = { id: string; nome: string; categoria: string; valor: number; ativo: boolean };
export type Config = { caixa_inicial: number; adicional_prioridade: number; markup_revenda: number; das_mensal: number; assessor_inicio: string };
import type { Produto } from "./produtos";

const n = (v: unknown) => Number(v ?? 0);

async function q<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function carregar() {
  const s = db();
  const [pedidos, pagamentos, gastos, fixas, cfg] = await Promise.all([
    q<Pedido>(s.from("pedidos").select("*").order("data", { ascending: false }).order("id", { ascending: false })),
    q<Pagamento>(s.from("pagamentos").select("*").order("data", { ascending: false })),
    q<Gasto>(s.from("gastos").select("*").order("data", { ascending: false }).order("id", { ascending: false })),
    q<Fixa>(s.from("despesas_fixas").select("*").order("id")),
    q<Config>(s.from("config").select("*")),
  ]);
  pedidos.forEach((p) => { p.valor_base = n(p.valor_base); p.valor_total = n(p.valor_total); p.adicional_prioridade = n(p.adicional_prioridade); });
  pagamentos.forEach((p) => (p.valor = n(p.valor)));
  gastos.forEach((g) => (g.valor = n(g.valor)));
  fixas.forEach((f) => (f.valor = n(f.valor)));
  const config: Config = cfg[0]
    ? {
        caixa_inicial: n(cfg[0].caixa_inicial), adicional_prioridade: n(cfg[0].adicional_prioridade), markup_revenda: n(cfg[0].markup_revenda),
        das_mensal: n(cfg[0].das_mensal), assessor_inicio: cfg[0].assessor_inicio ?? new Date().toISOString().slice(0, 10),
      }
    : { caixa_inicial: 0, adicional_prioridade: 0, markup_revenda: 30, das_mensal: 0, assessor_inicio: new Date().toISOString().slice(0, 10) };
  return { pedidos, pagamentos, gastos, fixas, config };
}

export type Base = Awaited<ReturnType<typeof carregar>>;

export function pagoPorPedido(pagamentos: Pagamento[]) {
  const m = new Map<string, number>();
  pagamentos.forEach((p) => m.set(p.pedido_id, (m.get(p.pedido_id) ?? 0) + p.valor));
  return m;
}

export function statusPedido(total: number, pago: number) {
  if (pago <= 0) return "Não pago";
  if (pago + 0.005 < total) return "Parcial";
  return "Pago";
}

function resumoMes(b: Base, mes: string) {
  const ped = b.pedidos.filter((p) => mesDe(p.data) === mes);
  const gasTodos = b.gastos.filter((g) => mesDe(g.data) === mes);
  const gas = gasTodos.filter((g) => !NAO_DESPESA.includes(g.categoria));
  const retiradas = gasTodos.filter((g) => NAO_DESPESA.includes(g.categoria)).reduce((s, g) => s + g.valor, 0);
  const pag = b.pagamentos.filter((p) => mesDe(p.data) === mes);
  const faturamento = ped.reduce((s, p) => s + p.valor_total, 0);
  const despesas = gas.reduce((s, g) => s + g.valor, 0);
  const recebido = pag.reduce((s, p) => s + p.valor, 0);
  return {
    mes, ped, gas, faturamento, despesas, recebido,
    lucro: faturamento - despesas,
    saldoCaixa: recebido - despesas - retiradas,
    pedidos: ped.length,
    clientes: new Set(ped.map((p) => p.cliente.trim().toLowerCase())).size,
  };
}

const variacao = (a: number, b: number) => (b === 0 ? null : (a - b) / Math.abs(b));

export function montarDashboard(b: Base, mes: string) {
  const atual = resumoMes(b, mes);
  const ant = resumoMes(b, somaMes(mes, -1));

  const meses = Array.from({ length: 6 }, (_, i) => somaMes(mes, i - 5));
  const serie = meses.map((m) => {
    const r = resumoMes(b, m);
    return { mes: mesCurto(m), faturamento: r.faturamento, despesas: r.despesas, lucro: r.lucro, caixa: r.saldoCaixa };
  });

  // Despesas por categoria
  const cat = new Map<string, number>();
  atual.gas.forEach((g) => cat.set(g.categoria, (cat.get(g.categoria) ?? 0) + g.valor));
  const categorias = [...cat.entries()]
    .map(([nome, valor]) => ({ nome, valor, pct: atual.despesas ? valor / atual.despesas : 0 }))
    .sort((a, b) => b.valor - a.valor);

  // Top clientes
  const cli = new Map<string, number>();
  atual.ped.forEach((p) => cli.set(p.cliente, (cli.get(p.cliente) ?? 0) + p.valor_total));
  const clientesOrd = [...cli.entries()].sort((a, b) => b[1] - a[1]);
  const top = clientesOrd.slice(0, 5).map(([nome, valor]) => ({ nome, valor, pct: atual.faturamento ? valor / atual.faturamento : 0 }));
  const outrosValor = clientesOrd.slice(5).reduce((s, [, v]) => s + v, 0);

  // Produtos
  const prod = new Map<string, number>();
  atual.ped.forEach((p) => prod.set(p.servico, (prod.get(p.servico) ?? 0) + p.valor_total));
  const produtos = [...prod.entries()]
    .map(([nome, valor]) => ({ nome, valor, pct: atual.faturamento ? valor / atual.faturamento : 0 }))
    .sort((a, b) => b.valor - a.valor);

  // Totais históricos
  const pagos = pagoPorPedido(b.pagamentos);
  const totalRecebido = b.pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalGasto = b.gastos.reduce((s, g) => s + g.valor, 0);
  const pendentes = b.pedidos
    .map((p) => ({ p, saldo: p.valor_total - (pagos.get(p.id) ?? 0) }))
    .filter((x) => x.saldo > 0.005);
  const aReceber = pendentes.reduce((s, x) => s + x.saldo, 0);
  const caixaAtual = b.config.caixa_inicial + totalRecebido - totalGasto;

  const margem = atual.faturamento ? atual.lucro / atual.faturamento : 0;
  const ticket = atual.pedidos ? atual.faturamento / atual.pedidos : 0;

  // Insights por regra
  const insights: { tipo: "ok" | "alerta" | "ruim"; texto: string }[] = [];
  const vLucro = variacao(atual.lucro, ant.lucro);
  if (atual.faturamento === 0 && atual.despesas === 0) {
    insights.push({ tipo: "alerta", texto: "Nenhum lançamento neste mês ainda." });
  } else if (atual.lucro < 0) {
    insights.push({ tipo: "ruim", texto: `Mês no prejuízo: faltam ${fmt(-atual.lucro)} de faturamento para cobrir as despesas.` });
  } else {
    insights.push({ tipo: "ok", texto: `Margem de lucro de ${(margem * 100).toFixed(1).replace(".", ",")}% no mês.` });
  }
  if (vLucro !== null && atual.lucro > 0) {
    insights.push({ tipo: vLucro >= 0 ? "ok" : "alerta", texto: `Lucro ${vLucro >= 0 ? "cresceu" : "caiu"} ${Math.abs(vLucro * 100).toFixed(0)}% em relação ao mês anterior.` });
  }
  categorias.forEach((c) => {
    const l = LIMITES[c.nome];
    if (!l) return;
    if (c.pct >= l.vermelho)
      insights.push({ tipo: "ruim", texto: `${c.nome} está em ${(c.pct * 100).toFixed(0)}% das despesas (limite ${(l.vermelho * 100).toFixed(0)}%).` });
    else if (c.pct >= l.amarelo)
      insights.push({ tipo: "alerta", texto: `${c.nome} em ${(c.pct * 100).toFixed(0)}% das despesas, perto do limite.` });
  });
  if (aReceber > 0)
    insights.push({ tipo: "alerta", texto: `${fmt(aReceber)} a receber de ${pendentes.length} pedido${pendentes.length > 1 ? "s" : ""}. Cobre os saldos em aberto.` });
  if (ticket > 0) insights.push({ tipo: "ok", texto: `Ticket médio de ${fmt(ticket)} por pedido.` });
  if (caixaAtual < 0) insights.push({ tipo: "ruim", texto: `Caixa negativo: ${fmt(caixaAtual)}.` });

  const fixasAtivas = b.fixas.filter((f) => f.ativo);

  return {
    atual, ant, serie, categorias, top, outrosValor, produtos, insights,
    aReceber, caixaAtual, margem, ticket, fixasAtivas,
    totalFixas: fixasAtivas.reduce((s, f) => s + f.valor, 0),
    var: {
      faturamento: variacao(atual.faturamento, ant.faturamento),
      despesas: variacao(atual.despesas, ant.despesas),
      lucro: vLucro,
      clientes: variacao(atual.clientes, ant.clientes),
      pedidos: variacao(atual.pedidos, ant.pedidos),
    },
  };
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export async function carregarProdutos() {
  const rows = await q<Produto>(db().from("produtos").select("*").eq("ativo", true).order("nome"));
  return rows.map((r) => ({ ...r, preco: n(r.preco) }));
}

export async function carregarPadroes() {
  const { data } = await db().from("config").select("prazo_padrao, pagamento_padrao, validade_dias, adicional_prioridade").maybeSingle();
  return {
    prazo: (data?.prazo_padrao as string | null) ?? "",
    pagamento: (data?.pagamento_padrao as string | null) ?? "",
    validade: Number(data?.validade_dias ?? 15),
    adicional: Number(data?.adicional_prioridade ?? 0),
  };
}
export type Padroes = Awaited<ReturnType<typeof carregarPadroes>>;

export type OrcamentoItem = {
  id: string; orcamento_id: string; tipo: "etiqueta" | "manual"; servico: string;
  tamanho: string | null; quantidade: number; descricao: string | null;
  valor_unitario: number; valor_total: number; ordem: number;
};
export type Orcamento = {
  id: string; numero: number; cliente: string; data: string; validade_dias: number;
  status: "pendente" | "aprovado" | "recusado"; prazo: string | null;
  pagamento: string | null; observacoes: string | null;
  desconto_a_vista: number | null; bonificacao: string | null; producao_prioritaria: boolean;
};

export async function carregarOrcamentos() {
  const s = db();
  const [orcs, itensRaw] = await Promise.all([
    q<Orcamento>(s.from("orcamentos").select("*").order("data", { ascending: false }).order("id", { ascending: false })),
    q<OrcamentoItem>(s.from("orcamento_itens").select("*").order("ordem")),
  ]);
  itensRaw.forEach((i) => { i.valor_unitario = n(i.valor_unitario); i.valor_total = n(i.valor_total); });
  orcs.forEach((o) => { o.desconto_a_vista = o.desconto_a_vista != null ? n(o.desconto_a_vista) : null; });
  const itensPorOrc = new Map<string, OrcamentoItem[]>();
  itensRaw.forEach((i) => {
    if (!itensPorOrc.has(i.orcamento_id)) itensPorOrc.set(i.orcamento_id, []);
    itensPorOrc.get(i.orcamento_id)!.push(i);
  });
  return orcs.map((o) => ({ ...o, itens: itensPorOrc.get(o.id) ?? [] }));
}

export type StatusOS = "aberta" | "producao" | "pronta" | "entregue";
export type OSItem = {
  id: string; os_id: string; servico: string; descricao: string;
  quantidade: number; valor_unitario: number; valor_total: number; ordem: number;
};
export type OS = {
  id: string; numero: number; cliente: string; telefone: string | null; data: string; prazo_entrega: string | null;
  status: StatusOS; forma_pagto: string | null; observacoes: string | null; pedido_id: string | null;
  orcamento_id?: string | null;
};

export async function carregarOS() {
  const s = db();
  const [ordens, itensRaw] = await Promise.all([
    q<OS>(s.from("ordens_servico").select("*").order("data", { ascending: false }).order("id", { ascending: false })),
    q<OSItem>(s.from("os_itens").select("*").order("ordem")),
  ]);
  itensRaw.forEach((i) => { i.valor_unitario = n(i.valor_unitario); i.valor_total = n(i.valor_total); });
  const porOS = new Map<string, OSItem[]>();
  itensRaw.forEach((i) => {
    if (!porOS.has(i.os_id)) porOS.set(i.os_id, []);
    porOS.get(i.os_id)!.push(i);
  });
  return ordens.map((o) => ({ ...o, itens: porOS.get(o.id) ?? [] }));
}
