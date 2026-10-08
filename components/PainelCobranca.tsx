import Enviar from "./Enviar";
import Excluir from "./Excluir";
import { brl, dataBR, hoje } from "@/lib/format";
import type { Pedido } from "@/lib/data";
import { registrarPagamento, excluirPedido } from "@/app/actions";
import { Valor } from "@/components/Privacidade";

type Item = { pedido: Pedido; pago: number; saldo: number; novo: boolean };

export default function PainelCobranca({ itens }: { itens: Item[] }) {
  const devendoTudo = itens.filter((i) => i.pago <= 0.005);
  const pagouParte = itens.filter((i) => i.pago > 0.005 && i.saldo > 0.005);
  const totalDevendo = devendoTudo.reduce((s, i) => s + i.saldo, 0);
  const totalParcial = pagouParte.reduce((s, i) => s + i.saldo, 0);

  if (!devendoTudo.length && !pagouParte.length) {
    return (
      <div className="painel p-5 text-sm text-mute">
        Ninguém devendo por aqui. 🎉
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Bloco
        titulo="Devendo tudo"
        cor="magenta"
        total={totalDevendo}
        itens={devendoTudo}
      />
      <Bloco
        titulo="Pagou parte"
        cor="amarelo"
        total={totalParcial}
        itens={pagouParte}
      />
    </div>
  );
}

function Bloco({ titulo, cor, total, itens }: { titulo: string; cor: "magenta" | "amarelo"; total: number; itens: Item[] }) {
  const corTexto = cor === "magenta" ? "text-magenta" : "text-amarelo";
  const corBorda = cor === "magenta" ? "border-magenta/40" : "border-amarelo/40";
  const corBg = cor === "magenta" ? "bg-magenta/10" : "bg-amarelo/10";

  return (
    <div className="painel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`titulo flex items-center gap-2 ${corTexto}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${cor === "magenta" ? "bg-magenta" : "bg-amarelo"}`} />
          {titulo}
        </h3>
        <span className={`font-display font-semibold ${corTexto}`}><Valor>{brl(total)}</Valor></span>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-mute">Nenhum cliente aqui.</p>
      ) : (
        <ul className="space-y-2.5">
          {itens.map(({ pedido: p, saldo, novo }) => (
            <li key={p.id} className={`rounded-lg border ${corBorda} ${corBg} p-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-ink">{p.cliente}</span>
                    {novo && (
                      <span className="rounded bg-ciano/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ciano">
                        Novo
                      </span>
                    )}
                    {p.prioridade && (
                      <span className="rounded bg-roxo/20 px-1.5 py-0.5 text-[10px] text-roxo">48h</span>
                    )}
                  </div>
                  <div className="text-xs text-mute">
                    {p.servico}
                    {p.descricao && ` · ${p.descricao}`} · {dataBR(p.data)}
                  </div>
                </div>
                <div className={`whitespace-nowrap font-display text-lg font-bold ${corTexto}`}><Valor>{brl(saldo)}</Valor></div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <form action={registrarPagamento} className="flex flex-1 gap-1.5">
                  <input type="hidden" name="pedido_id" value={p.id} />
                  <input
                    name="valor"
                    defaultValue={saldo.toFixed(2).replace(".", ",")}
                    inputMode="decimal"
                    className="campo w-24 py-1 text-sm"
                    aria-label="Valor recebido"
                  />
                  <input name="data" type="date" defaultValue={hoje()} className="campo w-[124px] py-1 text-sm" aria-label="Data" />
                  <Enviar className="botao2 py-1 text-sm">Receber</Enviar>
                </form>
                <Excluir action={excluirPedido} id={p.id} texto={`Excluir o pedido de ${p.cliente}?`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
