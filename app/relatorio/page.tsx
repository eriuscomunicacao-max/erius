import Cabecalho from "@/components/Cabecalho";
import { ICheck, ILampada } from "@/components/Icones";
import { montarRelatorio } from "@/lib/relatorio";
import { brl, dataBR, mesAtual, pct } from "@/lib/format";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Relatorio({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const r = await montarRelatorio(mes);
  const res = r.resultado;

  return (
    <>
      <Cabecalho titulo="Relatório Mensal" sub={`Fechamento de ${r.titulo}`} mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute">
            {r.fechado ? "Mês fechado." : `Parcial até ${dataBR(r.ate)}. Os números fecham no último dia do mês.`}
          </p>
          <a href={`/relatorio/pdf?mes=${mes}`} target="_blank" rel="noopener noreferrer" className="botao">Baixar PDF</a>
        </div>

        {/* 1. Resultado */}
        <section className="painel p-5">
          <h2 className="titulo mb-4">1. Resultado do mês</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Num rotulo="Vendido" valor={brl(res.vendido)} sub={`${res.varVendido} vs. ${r.anterior}`} cls="text-ink" />
            <Num rotulo="Recebido (após retiradas)" valor={brl(res.recebidoLiq)} sub={`${brl(res.recebido)} − ${brl(res.retirado)}`} cls="text-ciano" />
            <Num rotulo="Lucro" valor={brl(res.lucro)} sub={`margem ${pct(res.margem)} · ${res.varLucro} vs. ${r.anterior}`} cls={res.lucro < 0 ? "text-magenta" : "text-ciano"} />
            <Num rotulo="Em caixa agora" valor={r.emCaixa !== null ? brl(r.emCaixa) : "—"} sub="soma dos envelopes" cls="text-amarelo" />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* 2. Envelopes */}
          <section className="painel p-5">
            <h2 className="titulo mb-3">2. Envelopes</h2>
            {r.envelopes.length ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-mute">
                  <tr><th className="pb-2">Envelope</th><th className="pb-2 text-right">Entrou</th><th className="pb-2 text-right">Retirado</th><th className="pb-2 text-right">Saldo</th></tr>
                </thead>
                <tbody>
                  {r.envelopes.map((e) => (
                    <tr key={e.nome} className="border-t border-line">
                      <td className="py-2">{e.nome}{e.aviso && <span className="block text-[11px] text-mute">{e.aviso}</span>}</td>
                      <td className="py-2 text-right text-ciano"><Valor>{brl(e.entrou)}</Valor></td>
                      <td className="py-2 text-right text-magenta">{e.retirado ? `−${brl(e.retirado)}` : brl(0)}</td>
                      <td className={`py-2 text-right font-semibold ${e.saldo < 0 ? "text-magenta" : "text-ink"}`}><Valor>{brl(e.saldo)}</Valor></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-mute">Ative o Meu Assessor para ver os envelopes.</p>}
          </section>

          {/* 3 e 4 */}
          <section className="painel p-5">
            <h2 className="titulo mb-3">3. Tráfego e clientes</h2>
            <div className="grid grid-cols-2 gap-4">
              <Num rotulo="Investido em anúncios" valor={brl(r.trafego.investido)} sub={r.trafego.retorno !== null ? `retorno ${r.trafego.retorno.toFixed(1).replace(".", ",")}x` : "sem gasto lançado"} cls="text-ink" />
              <Num rotulo="Clientes atendidos" valor={String(r.clientes.atendidos)} sub={`${r.clientes.novos} novo${r.clientes.novos === 1 ? "" : "s"} · ${r.clientes.pedidos} pedidos`} cls="text-ink" />
              <Num rotulo="Ticket médio" valor={brl(r.clientes.ticket)} cls="text-ink" />
              <Num rotulo="A receber na entrega" valor={brl(r.clientes.aReceberMes)} sub="dos pedidos deste mês" cls="text-amarelo" />
            </div>
            {r.clientes.maior && (
              <p className="mt-3 text-sm text-mute">Maior cliente: <span className="text-ink">{r.clientes.maior.nome}</span> · <Valor>{brl(r.clientes.maior.valor)}</Valor> ({pct(r.clientes.maior.pct)})</p>
            )}
          </section>

          {/* 5 e 6 */}
          <section className="painel p-5">
            <h2 className="titulo mb-3">4. Produção e orçamentos</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Num rotulo="OS abertas" valor={String(r.producao.abertas)} cls="text-ink" />
              <Num rotulo="Entregues" valor={`${r.producao.entregues}/${r.producao.prazoNoMes}`} sub="com prazo no mês" cls="text-ciano" />
              <Num rotulo="Atrasadas agora" valor={String(r.producao.atrasadas)} cls={r.producao.atrasadas ? "text-magenta" : "text-ink"} />
              <Num rotulo="Orçamentos aprovados" valor={`${r.orcamentos.aprovados}/${r.orcamentos.enviados}`} sub={r.orcamentos.conversao !== null ? `${pct(r.orcamentos.conversao, 0)} de conversão` : undefined} cls="text-ink" />
            </div>
          </section>

          <section className="painel p-5">
            <h2 className="titulo mb-3">5. O que mais vendeu</h2>
            {r.produtos.length ? (
              <ul className="space-y-2 text-sm">
                {r.produtos.map((p) => (
                  <li key={p.nome} className="flex justify-between"><span>{p.nome}</span><span className="text-mute"><Valor>{brl(p.valor)}</Valor> · {pct(p.pct, 0)}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-mute">Sem vendas no mês.</p>}
          </section>
        </div>

        {/* 7. Plano */}
        <section className="painel border border-ciano/40 p-5">
          <h2 className="titulo mb-3">6. Plano pro próximo mês</h2>
          {r.meta && <p className="mb-3 font-semibold text-ciano">Meta: {r.meta}</p>}
          <ul className="space-y-2 text-sm">
            {r.recs.map((t, i) => (
              <li key={i} className="flex gap-2"><ILampada className="mt-0.5 h-4 w-4 shrink-0 text-amarelo" />{t}</li>
            ))}
          </ul>
        </section>

        <p className="flex items-center gap-2 text-xs text-mute"><ICheck className="h-4 w-4" />Gerado automaticamente a partir dos seus lançamentos. Dá pra puxar qualquer mês, a qualquer dia.</p>
      </div>
    </>
  );
}

function Num({ rotulo, valor, sub, cls }: { rotulo: string; valor: string; sub?: string; cls: string }) {
  return (
    <div>
      <div className="text-xs text-mute">{rotulo}</div>
      <div className={`font-display text-xl font-bold ${cls}`}><Valor>{valor}</Valor></div>
      {sub && <div className="text-[11px] text-mute"><Valor>{sub}</Valor></div>}
    </div>
  );
}
