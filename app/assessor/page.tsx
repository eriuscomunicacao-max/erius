import Cabecalho from "@/components/Cabecalho";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import { ICheck, IAlerta, ILampada } from "@/components/Icones";
import { carregar } from "@/lib/data";
import { carregarEnvelopes, montarAssessor, categoriasDoEnvelope } from "@/lib/assessor";
import { brl, dataBR, hoje, mesAtual, mesLongo } from "@/lib/format";
import { retirarEnvelope, excluirGasto, atualizarGasto } from "../actions";
import Editar, { Campo } from "@/components/Editar";
import { paraCampo } from "@/lib/format";
import Excluir from "@/components/Excluir";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

const COR: Record<string, { txt: string; barra: string; borda: string }> = {
  "Anúncios (Ads)": { txt: "text-ciano", barra: "bg-ciano", borda: "border-ciano/40" },
  Material: { txt: "text-magenta", barra: "bg-magenta", borda: "border-magenta/40" },
  "Pró-labore": { txt: "text-amarelo", barra: "bg-amarelo", borda: "border-amarelo/40" },
  "Caixa da empresa": { txt: "text-ciano", barra: "bg-ciano", borda: "border-ciano/40" },
};
const corDe = (cat: string) => COR[cat] ?? { txt: "text-ink", barra: "bg-mute", borda: "border-line" };
const fmtX = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;

export default async function Assessor({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const [b, envelopes] = await Promise.all([carregar(), carregarEnvelopes()]);

  if (!envelopes) {
    return (
      <>
        <Cabecalho titulo="Meu Assessor" sub="Divisão do dinheiro recebido" />
        <div className="p-5">
          <div className="painel p-5 text-sm text-mute">
            Falta criar a tabela no banco. Rode o arquivo <span className="text-ink">supabase/assessor.sql</span> no SQL Editor do Supabase e recarregue a página.
          </div>
        </div>
      </>
    );
  }

  const a = montarAssessor(b, envelopes, mes);
  const hj = hoje();

  return (
    <>
      <Cabecalho titulo="Meu Assessor" sub={`O dinheiro recebido, dividido por destino · ${mesLongo(mes)}`} mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        {Math.abs(a.somaPct - 100) > 0.01 && (
          <div className="painel flex items-center gap-2 border-magenta/50 p-4 text-sm text-magenta">
            <IAlerta className="h-4 w-4" /> As porcentagens somam {a.somaPct.toLocaleString("pt-BR")}%. Ajuste em Configurações para fechar 100%.
          </div>
        )}
        {a.antesDoInicio && (
          <div className="painel p-4 text-sm text-mute">O assessor começa em {dataBR(a.inicio)}. Escolha um mês a partir daí.</div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Recebido neste mês" valor={brl(a.recebidoMes - a.retiradoMes)} cls="text-ciano" sub={a.retiradoMes ? `${brl(a.recebidoMes)} recebidos − ${brl(a.retiradoMes)} retirados` : undefined} />
          <Kpi rotulo="Retirado neste mês" valor={a.retiradoMes ? `−${brl(a.retiradoMes)}` : brl(0)} cls="text-magenta" />
          <Kpi rotulo={`Recebido desde ${dataBR(a.inicio)}`} valor={brl(a.recebido - a.retirado)} cls="text-ink" sub={a.retirado ? `${brl(a.recebido)} recebidos − ${brl(a.retirado)} retirados` : undefined} />
          <Kpi rotulo="Em caixa agora" valor={brl(a.emCaixa)} cls={a.emCaixa < 0 ? "text-magenta" : "text-amarelo"} sub="soma do disponível dos envelopes" destaque />
        </div>

        {/* Envelopes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {a.envelopes.map((e) => {
            const c = corDe(e.categoria);
            const usado = e.entrou > 0 ? Math.min(1, e.gasto / e.entrou) : e.gasto > 0 ? 1 : 0;
            return (
              <section key={e.id} className={`painel border p-5 ${c.borda}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="titulo">{e.nome}</h2>
                    <p className="text-xs text-mute">{e.pct.toLocaleString("pt-BR")}% do recebido · gastos em "{categoriasDoEnvelope(e.categoria).join('", "')}"</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-mute">Disponível</div>
                    <div className={`font-display text-2xl font-bold ${e.saldo < -0.005 ? "text-magenta" : c.txt}`}><Valor>{brl(e.saldo)}</Valor></div>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                  <div className={`h-full ${e.saldo < -0.005 ? "bg-magenta" : c.barra}`} style={{ width: `${usado * 100}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="text-mute">Entrou <span className="text-ink"><Valor>{brl(e.entrou)}</Valor></span></div>
                  <div className="text-right text-mute">Retirado <span className="text-ink"><Valor>{brl(e.gasto)}</Valor></span></div>
                  <div className="text-xs text-mute">este mês +<Valor>{brl(e.entrouMes)}</Valor></div>
                  <div className="text-right text-xs text-mute">este mês −<Valor>{brl(e.gastoMes)}</Valor></div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                  {e.saldo < -0.005 && (
                    <Linha tipo="ruim">Gastou <Valor>{brl(-e.saldo)}</Valor> além do envelope. Esse dinheiro saiu de outro destino.</Linha>
                  )}

                  {e.reposicao && (
                    e.saldo >= e.reposicao.media ? (
                      <Linha tipo="ok">Já dá pra repor. Preço médio: <Valor>{brl(e.reposicao.media)}</Valor>.</Linha>
                    ) : (
                      <Linha tipo="info">
                        Faltam <Valor>{brl(e.reposicao.media - Math.max(0, e.saldo))}</Valor> pra próxima compra (média das últimas {e.reposicao.compras}: <Valor>{brl(e.reposicao.media)}</Valor>).
                      </Linha>
                    )
                  )}
                  {!e.reposicao && e.categoria === "Material" && (
                    <Linha tipo="info">Lance uma compra de {e.nome.toLowerCase()} em Gastos para calcular o preço de reposição.</Linha>
                  )}

                  {e.categoria === "Anúncios (Ads)" && a.roas && (
                    a.roas.mes !== null ? (
                      <Linha tipo={a.roas.mes >= 3 ? "ok" : "info"}>
                        Retorno do tráfego no mês: {fmtX(a.roas.mes)} (cada R$ 1 em anúncio virou <Valor>{brl(a.roas.mes)}</Valor> em vendas).
                        {a.roas.periodo !== null && ` Acumulado: ${fmtX(a.roas.periodo)}.`}
                      </Linha>
                    ) : (
                      <Linha tipo="info">Lance os gastos de anúncio em Gastos (categoria Anúncios) pra ver o retorno do tráfego.</Linha>
                    )
                  )}

                  <FormReset action={retirarEnvelope} className="flex flex-wrap items-center gap-2 pt-1">
                    {categoriasDoEnvelope(e.categoria).length > 1 ? (
                      <select name="categoria" className="campo w-auto py-1.5 text-sm" aria-label="Para que foi o gasto">
                        <option value={e.categoria}>Reserva / outros</option>
                        {categoriasDoEnvelope(e.categoria).slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="hidden" name="categoria" value={e.categoria} />
                    )}
                    <input type="hidden" name="nome" value={e.nome} />
                    <input name="valor" required inputMode="decimal" placeholder="R$" className="campo w-24 py-1.5 text-sm" aria-label={`Valor retirado de ${e.nome}`} />
                    <input name="descricao" placeholder={e.categoria === "Pró-labore" ? "Retirada de pró-labore" : e.categoria === "Caixa da empresa" ? "Ex: parcela da impressora, conta de luz" : `Ex: compra de ${e.nome.toLowerCase()}`} className="campo min-w-[120px] flex-1 py-1.5 text-sm" aria-label="Descrição" />
                    <input name="data" type="date" defaultValue={hj} className="campo w-[140px] py-1.5 text-sm" aria-label="Data" />
                    <Enviar className="botao py-1.5 text-sm">Retirar</Enviar>
                  </FormReset>

                  {e.ultimas.length > 0 && (
                    <ul className="space-y-1 pt-2 text-xs">
                      {e.ultimas.map((g) => (
                        <li key={g.id} className="flex items-center justify-between gap-2 text-mute">
                          <span className="min-w-0 truncate">{dataBR(g.data)} · {g.descricao}</span>
                          <span className="flex items-center gap-1 text-ink">
                            −<Valor>{brl(g.valor)}</Valor>
                            <Editar titulo="Editar retirada" action={atualizarGasto}>
                              <input type="hidden" name="id" value={g.id} />
                              <Campo nome="descricao" rotulo="Descrição" valor={g.descricao} largo />
                              <Campo nome="valor" rotulo="Valor (R$)" valor={paraCampo(g.valor)} decimal />
                              <Campo nome="data" rotulo="Data" valor={g.data} tipo="date" />
                            </Editar>
                            <Excluir action={excluirGasto} id={g.id} texto={`Excluir a retirada de ${brl(g.valor)}? O valor volta para o envelope.`} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Fora dos envelopes + DAS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="painel p-5">
            <h2 className="titulo mb-2">Gastos fora dos envelopes</h2>
            {a.fora > 0 ? (
              <>
                <p className="mb-3 text-sm text-amarelo"><Valor>{brl(a.fora)}</Valor> saíram do caixa sem envelope próprio desde {dataBR(a.inicio)}.</p>
                <ul className="space-y-1 text-sm">
                  {a.foraLista.slice(0, 6).map((g) => (
                    <li key={g.id} className="flex justify-between gap-2 text-mute">
                      <span>{dataBR(g.data)} · {g.descricao} <span className="text-xs">({g.categoria})</span></span>
                      <span className="text-ink"><Valor>{brl(g.valor)}</Valor></span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Linha tipo="ok">Tudo o que saiu tinha envelope.</Linha>
            )}
          </section>

          <section className="painel p-5">
            <h2 className="titulo mb-2">Imposto (DAS)</h2>
            {a.das ? (
              <div className="space-y-1 text-sm">
                <p className="text-mute">Separado antes da divisão: até <Valor>{brl(a.das.mensal)}</Valor> por mês.</p>
                <p className="text-mute">Reservado <span className="text-ink"><Valor>{brl(a.das.reservado)}</Valor></span> · Pago <span className="text-ink"><Valor>{brl(a.das.pago)}</Valor></span></p>
                <p className={a.das.saldo >= 0 ? "text-ciano" : "text-magenta"}>Saldo do imposto: <Valor>{brl(a.das.saldo)}</Valor></p>
              </div>
            ) : (
              <p className="text-sm text-mute">Desligado. Se a empresa pagar DAS, informe o valor mensal em Configurações e ele é separado antes da divisão.</p>
            )}
          </section>
        </div>

        <p className="flex items-center gap-2 text-xs text-mute">
          <ILampada className="h-4 w-4" />
          A divisão usa só o dinheiro recebido, não o vendido. O saldo de cada envelope passa para o mês seguinte.
        </p>
      </div>
    </>
  );
}

function Kpi({ rotulo, valor, cls, sub, destaque }: { rotulo: string; valor: string; cls: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`painel p-4 ${destaque ? "border border-amarelo/50" : ""}`}>
      <div className="text-xs text-mute">{rotulo}</div>
      <div className={`mt-1 font-display text-xl font-bold lg:text-2xl ${cls}`}><Valor>{valor}</Valor></div>
      {sub && <div className="mt-0.5 text-[11px] text-mute"><Valor>{sub}</Valor></div>}
    </div>
  );
}

function Linha({ tipo, children }: { tipo: "ok" | "ruim" | "info"; children: React.ReactNode }) {
  const cls = tipo === "ok" ? "text-ciano" : tipo === "ruim" ? "text-magenta" : "text-mute";
  return (
    <p className={`flex items-start gap-2 ${cls}`}>
      {tipo === "ok" ? <ICheck className="mt-0.5 h-4 w-4 shrink-0" /> : tipo === "ruim" ? <IAlerta className="mt-0.5 h-4 w-4 shrink-0" /> : <ILampada className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}
