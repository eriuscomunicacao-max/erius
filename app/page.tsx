import Cabecalho from "@/components/Cabecalho";
import Kpi from "@/components/Kpi";
import { BarrasFatDesp, LinhaCaixa, Rosca, Combinado } from "@/components/Graficos";
import { ICifrao, ICarteira, ITendencia, IPessoas, IPedido, ISeta, ICheck, IAlerta, ILampada, ICasa } from "@/components/Icones";
import { carregar, montarDashboard } from "@/lib/data";
import { carregarEnvelopes, categoriasDoEnvelope } from "@/lib/assessor";
import { mesDe } from "@/lib/format";
import { brl, pct, mesAtual, num } from "@/lib/format";
import { CORES } from "@/lib/constants";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const [b, envelopes] = await Promise.all([carregar(), carregarEnvelopes()]);
  const d = montarDashboard(b, mes);
  const a = d.atual;
  // Retiradas feitas no Meu Assessor abatem do recebido
  const catsEnv = new Set((envelopes ?? []).flatMap((e) => categoriasDoEnvelope(e)));
  const retiradasMes = b.gastos
    .filter((g) => catsEnv.has(g.categoria) && mesDe(g.data) === mes && g.data >= b.config.assessor_inicio)
    .reduce((t, g) => t + g.valor, 0);
  const recebidoLiq = a.recebido - retiradasMes;
  const maxProd = Math.max(1, ...d.produtos.map((p) => p.valor));
  const corProd = ["#00AEEF", "#EC008C", "#FFF200", "#F5F5F5", "#6B6B6B", "#33C3F2"];

  return (
    <>
      <Cabecalho titulo="Dashboard Financeiro" sub="Visão geral do seu negócio" mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi
            titulo="Faturamento (vendido)"
            valor={brl(a.faturamento)}
            variacao={d.var.faturamento}
            cor="#00AEEF"
            Icone={ICifrao}
            rodape={{ rotulo: retiradasMes ? "Recebido (já descontadas as retiradas)" : "Recebido até agora", valor: brl(recebidoLiq) }}
          />
          <Kpi titulo="Total de despesas" valor={brl(a.despesas)} variacao={d.var.despesas} cor="#EC008C" Icone={ICarteira} inverso />
          <Kpi titulo="Lucro líquido" valor={brl(a.lucro)} variacao={d.var.lucro} cor="#00AEEF" Icone={ITendencia} />
          <Kpi titulo="Clientes ativos" valor={num(a.clientes)} variacao={d.var.clientes} cor="#FFF200" Icone={IPessoas} />
          <Kpi titulo="Pedidos no período" valor={num(a.pedidos)} variacao={d.var.pedidos} cor="#F5F5F5" Icone={IPedido} />
        </section>

        {/* Gráficos */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr_1.1fr]">
          <div className="painel p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="titulo">Faturamento x Despesas</h2>
              <Legenda itens={[["Faturamento", "#00AEEF"], ["Despesas", "#EC008C"]]} />
            </div>
            <BarrasFatDesp dados={d.serie} />
          </div>
          <div className="painel p-5">
            <h2 className="titulo mb-2">Fluxo de Caixa</h2>
            <LinhaCaixa dados={d.serie} />
          </div>
          <div className="painel p-5">
            <h2 className="titulo mb-4">Despesas por Categoria</h2>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Rosca dados={d.categorias} total={a.despesas} cores={CORES} />
              <ul className="w-full space-y-2.5 text-sm">
                {d.categorias.length === 0 && <li className="text-mute">Nenhum gasto neste mês.</li>}
                {d.categorias.map((c, i) => (
                  <li key={c.nome} className="flex items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                    <span className="flex-1 text-ink/90">{c.nome}</span>
                    <span className="text-ink">{pct(c.pct, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tabelas */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_0.8fr_0.95fr]">
          <div className="painel p-5">
            <h2 className="titulo mb-3">Top 5 Clientes</h2>
            <table className="tabela">
              <thead>
                <tr><th>Cliente</th><th className="text-right">Faturamento</th><th className="text-right">% do total</th></tr>
              </thead>
              <tbody>
                {d.top.length === 0 && <tr><td colSpan={3} className="text-mute">Nenhum pedido neste mês.</td></tr>}
                {d.top.map((c, i) => (
                  <tr key={c.nome}>
                    <td className="max-w-[140px]">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CORES[i] }} />
                        <span className="truncate">{c.nome}</span>
                      </span>
                    </td>
                    <td className="text-right"><Valor>{brl(c.valor)}</Valor></td>
                    <td className="text-right text-mute">{pct(c.pct)}</td>
                  </tr>
                ))}
                {d.outrosValor > 0 && (
                  <tr className="text-mute">
                    <td>Outros clientes</td>
                    <td className="text-right"><Valor>{brl(d.outrosValor)}</Valor></td>
                    <td className="text-right">{pct(a.faturamento ? d.outrosValor / a.faturamento : 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="painel p-5">
            <h2 className="titulo mb-4">Produtos / Serviços Mais Vendidos</h2>
            <ul className="space-y-3.5">
              {d.produtos.length === 0 && <li className="text-sm text-mute">Nenhum pedido neste mês.</li>}
              {d.produtos.map((p, i) => (
                <li key={p.nome}>
                  <div className="mb-1 text-sm text-ink/90">{p.nome}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 flex-1">
                      <div className="h-4 rounded" style={{ width: `${Math.max(4, (p.valor / maxProd) * 100)}%`, background: corProd[i % corProd.length] }} />
                    </div>
                    <span className="w-24 text-right text-sm"><Valor>{brl(p.valor)}</Valor></span>
                    <span className="w-12 text-right text-sm text-mute">{pct(p.pct, 0)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="painel p-5">
            <h2 className="titulo mb-4">Resumo do Período</h2>
            <ul className="space-y-4">
              <Resumo icone={<ISeta className="h-5 w-5" />} cor="#00AEEF" rotulo="Faturamento (vendido)" valor={brl(a.faturamento)} />
              <Resumo icone={<ICifrao className="h-5 w-5" />} cor="#00AEEF" rotulo={retiradasMes ? `Recebido após retiradas (${brl(a.recebido)} − ${brl(retiradasMes)})` : "Recebido até agora"} valor={brl(recebidoLiq)} />
              <Resumo icone={<ISeta baixo className="h-5 w-5" />} cor="#EC008C" rotulo="Despesas" valor={brl(a.despesas)} />
              <Resumo icone={<span className="text-lg font-bold">=</span>} cor="#8A9BB5" rotulo="Lucro líquido" valor={brl(a.lucro)} />
              <Resumo icone={<span className="text-lg font-bold">%</span>} cor="#8A9BB5" rotulo="Margem de lucro" valor={pct(d.margem)} />
              <Resumo icone={<ICifrao className="h-5 w-5" />} cor="#FFF200" rotulo="A receber (total)" valor={brl(d.aReceber)} />
            </ul>
          </div>

          <div className="painel p-5">
            <h2 className="titulo mb-3 flex items-center gap-2"><ICasa className="h-5 w-5" /> Despesas Fixas</h2>
            <table className="tabela">
              <tbody>
                {d.fixasAtivas.map((f) => (
                  <tr key={f.id}><td className="px-0">{f.nome}</td><td className="px-0 text-right"><Valor>{brl(f.valor)}</Valor></td></tr>
                ))}
                <tr>
                  <td className="px-0 pt-3 font-display font-semibold">Total fixas</td>
                  <td className="px-0 pt-3 text-right font-display font-semibold"><Valor>{brl(d.totalFixas)}</Valor></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Rodapé */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="painel p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="titulo">Faturamento vs. Lucro <span className="text-sm font-normal text-mute">(últimos 6 meses)</span></h2>
              <Legenda itens={[["Faturamento", "#00AEEF"], ["Despesas", "#EC008C"], ["Lucro", "#FFF200"]]} />
            </div>
            <Combinado dados={d.serie} />
          </div>
          <div className="painel p-5">
            <h2 className="titulo mb-3 flex items-center gap-2"><ILampada className="h-5 w-5 text-amarelo" /> Insights e Recomendações</h2>
            <ul className="space-y-2">
              {d.insights.map((i, k) => (
                <li key={k} className="flex items-start gap-2.5 text-sm">
                  {i.tipo === "ok" ? (
                    <ICheck className="mt-0.5 h-4 w-4 shrink-0 text-verde" />
                  ) : (
                    <IAlerta className={`mt-0.5 h-4 w-4 shrink-0 ${i.tipo === "ruim" ? "text-vermelho" : "text-amarelo"}`} />
                  )}
                  <span className="text-ink/90">{i.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function Legenda({ itens }: { itens: [string, string][] }) {
  return (
    <div className="flex gap-4 text-xs text-ink/80">
      {itens.map(([n, c]) => (
        <span key={n} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{n}</span>
      ))}
    </div>
  );
}

function Resumo({ icone, cor, rotulo, valor }: { icone: React.ReactNode; cor: string; rotulo: string; valor: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${cor}22`, color: cor }}>{icone}</span>
      <span className="leading-tight">
        <span className="block text-xs text-mute">{rotulo}</span>
        <span className="font-display font-semibold text-ink"><Valor>{valor}</Valor></span>
      </span>
    </li>
  );
}
