import "server-only";
import { carregar, montarDashboard, carregarOS, carregarOrcamentos, pagoPorPedido } from "./data";
import { carregarEnvelopes, montarAssessor } from "./assessor";
import { brl, hoje, mesAtual, mesDe, mesLongo, somaMes, ultimoDia } from "./format";

const pctTxt = (v: number) => `${(v * 100).toFixed(0)}%`;
const varTxt = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`);

export async function montarRelatorio(mes: string) {
  const [b, envelopes, ordens, orcs] = await Promise.all([
    carregar(),
    carregarEnvelopes(),
    carregarOS().catch(() => []),
    carregarOrcamentos().catch(() => []),
  ]);
  const d = montarDashboard(b, mes);
  const a = d.atual;
  const hj = hoje();
  const fechado = mes < mesAtual();

  // Envelopes / retiradas
  const ass = envelopes ? montarAssessor(b, envelopes, mes) : null;
  const retirado = ass ? ass.retiradoMes : 0;

  // Clientes
  const primeiro = new Map<string, string>();
  [...b.pedidos].sort((x, y) => x.data.localeCompare(y.data)).forEach((p) => {
    const k = p.cliente.trim().toLowerCase();
    if (!primeiro.has(k)) primeiro.set(k, p.data);
  });
  const novos = [...primeiro.values()].filter((dt) => mesDe(dt) === mes).length;
  const pagos = pagoPorPedido(b.pagamentos);
  const pendMes = a.ped.map((p) => p.valor_total - (pagos.get(p.id) ?? 0)).filter((s) => s > 0.005);
  const aReceberMes = pendMes.reduce((t, s) => t + s, 0);

  // Produção (OS com prazo no mês)
  const osMes = ordens.filter((o) => o.prazo_entrega && mesDe(o.prazo_entrega) === mes);
  const entregues = osMes.filter((o) => o.status === "entregue").length;
  const atrasadas = ordens.filter((o) => o.status !== "entregue" && o.prazo_entrega && o.prazo_entrega < hj).length;
  const abertas = ordens.filter((o) => mesDe(o.data) === mes).length;

  // Orçamentos
  const orcMes = orcs.filter((o) => mesDe(o.data) === mes);
  const aprovados = orcMes.filter((o) => o.status === "aprovado").length;
  const conversao = orcMes.length ? aprovados / orcMes.length : null;

  // Tráfego
  const roas = ass?.roas ?? null;
  const envTraf = ass?.envelopes.find((e) => e.tipo === "trafego");
 const envBob = ass?.envelopes.find((e) => e.tipo === "reposicao");

  // Plano pro próximo mês (regras)
  const recs: string[] = [];
  let meta: string | null = null;
  if (envBob?.reposicao && envBob.saldo < envBob.reposicao.media && envBob.pct > 0) {
    const falta = envBob.reposicao.media - Math.max(0, envBob.saldo);
    meta = `Receber ${brl(falta / (envBob.pct / 100))} pra juntar o que falta da próxima compra de material (${brl(falta)}).`;
  } else if (a.faturamento > 0) {
    meta = `Vender ${brl(a.faturamento * 1.1)} (10% acima deste mês).`;
  }
  if (roas?.mes != null) {
    if (roas.mes >= 3) recs.push(`Tráfego retornou ${roas.mes.toFixed(1).replace(".", ",")}x. Dá pra aumentar a verba com segurança.`);
    else if (roas.mes < 2) recs.push(`Retorno do tráfego baixo (${roas.mes.toFixed(1).replace(".", ",")}x). Revise criativos e público antes de investir mais.`);
  } else if (envTraf && envTraf.saldo > 20) {
    recs.push(`Tem ${brl(envTraf.saldo)} parados no envelope de tráfego. Coloque pra rodar.`);
  }
  if (atrasadas) recs.push(`${atrasadas} OS atrasada${atrasadas > 1 ? "s" : ""}. Priorize antes de pegar serviço novo.`);
  if (conversao !== null && orcMes.length >= 3 && conversao < 0.5)
    recs.push(`Só ${pctTxt(conversao)} dos orçamentos viraram venda. Faça follow-up no WhatsApp 2 dias depois de enviar.`);
  if (d.top[0] && d.top[0].pct > 0.3) recs.push(`${d.top[0].nome} representa ${pctTxt(d.top[0].pct)} do faturamento. Busque novos clientes pra não depender de um só.`);
  ass?.envelopes.filter((e) => e.saldo < -0.005).forEach((e) => recs.push(`Envelope ${e.nome} está negativo (${brl(e.saldo)}). Segure retiradas dele.`));
  if (d.aReceber > 0) recs.push(`${brl(d.aReceber)} a receber na entrega. Lembre de clicar em "Receber" ao entregar.`);
  if (!recs.length) recs.push("Mês equilibrado. Mantenha o ritmo e o tráfego rodando.");

  return {
    mes, titulo: mesLongo(mes), fechado, ate: fechado ? ultimoDia(mes) : hj, anterior: mesLongo(somaMes(mes, -1)),
    resultado: {
      vendido: a.faturamento, recebido: a.recebido, retirado, recebidoLiq: a.recebido - retirado,
      despesas: a.despesas, lucro: a.lucro, margem: d.margem,
      varVendido: varTxt(d.var.faturamento), varLucro: varTxt(d.var.lucro),
    },
    envelopes: ass
      ? ass.envelopes.map((e) => ({
          nome: e.nome, entrou: e.entrouMes, retirado: e.gastoMes, saldo: e.saldo,
          aviso: e.reposicao ? (e.saldo >= e.reposicao.media ? "já dá pra repor" : `faltam ${brl(e.reposicao.media - Math.max(0, e.saldo))}`) : null,
        }))
      : [],
    emCaixa: ass?.emCaixa ?? null,
    trafego: { investido: roas?.adsMes ?? 0, retorno: roas?.mes ?? null },
    clientes: { atendidos: a.clientes, novos, pedidos: a.pedidos, ticket: d.ticket, maior: d.top[0] ?? null, aReceberMes },
    producao: { abertas, prazoNoMes: osMes.length, entregues, atrasadas },
    orcamentos: { enviados: orcMes.length, aprovados, conversao },
    produtos: d.produtos.slice(0, 3),
    meta, recs: recs.slice(0, 4),
  };
}

export type Relatorio = Awaited<ReturnType<typeof montarRelatorio>>;
