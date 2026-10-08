import Cabecalho from "@/components/Cabecalho";
import Enviar from "@/components/Enviar";
import Excluir from "@/components/Excluir";
import NovaOS from "@/components/NovaOS";
import ArquivosOS from "@/components/ArquivosOS";
import { arquivosPorOS, type Arquivo } from "@/lib/arquivos";
import { getEmpresa } from "@/lib/empresa";
import { carregar, carregarOS, carregarProdutos, pagoPorPedido, type StatusOS } from "@/lib/data";
import { brl, dataBR, hoje } from "@/lib/format";
import { registrarPagamento, statusOS, excluirOS } from "../actions";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

const ETAPAS: { id: StatusOS; nome: string }[] = [
  { id: "aberta", nome: "Aberta" },
  { id: "producao", nome: "Em produção" },
  { id: "pronta", nome: "Pronta" },
  { id: "entregue", nome: "Entregue" },
];
const corEtapa: Record<StatusOS, string> = {
  aberta: "bg-ink/10 text-ink",
  producao: "bg-ciano/15 text-ciano",
  pronta: "bg-amarelo/15 text-amarelo",
  entregue: "bg-mute/15 text-mute",
};

const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

function prazoInfo(prazo: string | null, hj: string, status: StatusOS) {
  if (!prazo) return { texto: "Sem prazo", cls: "text-mute" };
  if (status === "entregue") return { texto: `Prazo era ${dataBR(prazo)}`, cls: "text-mute" };
  const d = dias(prazo, hj);
  if (d < 0) return { texto: `Atrasada ${-d} dia${d < -1 ? "s" : ""} (${dataBR(prazo)})`, cls: "text-magenta font-semibold" };
  if (d === 0) return { texto: "Entrega HOJE", cls: "text-amarelo font-semibold" };
  if (d === 1) return { texto: "Entrega amanhã", cls: "text-amarelo font-semibold" };
  return { texto: `Entrega ${dataBR(prazo)} · ${d} dias`, cls: "text-mute" };
}

function linkWhats(tel: string | null, msg: string) {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

export default async function OrdensServico() {
  const [b, ordens, produtos] = await Promise.all([carregar(), carregarOS(), carregarProdutos()]);
  const pagos = pagoPorPedido(b.pagamentos);
  const hj = hoje();
  const emp = await getEmpresa();
  const arquivos = await arquivosPorOS(ordens.map((o) => o.id));
  const nomes = [...new Set(b.pedidos.map((p) => p.cliente))].sort();

  const lista = ordens.map((o) => {
    const total = o.itens.reduce((s, i) => s + i.valor_total, 0);
    const pago = o.pedido_id ? pagos.get(o.pedido_id) ?? 0 : 0;
    return { ...o, total, pago, falta: Math.max(0, total - pago) };
  });
  const andamento = lista
    .filter((o) => o.status !== "entregue")
    .sort((a, c) => (a.prazo_entrega ?? "9999").localeCompare(c.prazo_entrega ?? "9999"));
  const entregues = lista.filter((o) => o.status === "entregue");
  const atrasadas = andamento.filter((o) => o.prazo_entrega && o.prazo_entrega < hj).length;
  const aReceber = lista.reduce((s, o) => s + o.falta, 0);

  return (
    <>
      <Cabecalho titulo="Ordens de Serviço" sub="Abra a OS, acompanhe a produção e o que falta receber" />
      <div className="space-y-4 p-4 lg:p-5">
        <div className="grid grid-cols-3 gap-3">
          <Resumo rotulo="Em andamento" valor={String(andamento.length)} cls="text-ink" />
          <Resumo rotulo="Atrasadas" valor={String(atrasadas)} cls={atrasadas ? "text-magenta" : "text-ink"} />
          <Resumo rotulo="Falta receber das OS" valor={brl(aReceber)} cls={aReceber > 0 ? "text-amarelo" : "text-ink"} />
        </div>

        <section className="painel p-5">
          <h2 className="titulo mb-4">Nova OS</h2>
          <NovaOS hoje={hj} nomes={nomes} produtos={produtos} />
        </section>

        <section className="painel p-5">
          <h2 className="titulo mb-4">Em andamento <span className="text-sm font-normal text-mute">(ordenadas pelo prazo)</span></h2>
          {andamento.length ? (
            <ul className="space-y-3">{andamento.map((o) => <CartaoOS key={o.id} o={o} hj={hj} empresaId={emp.id} arquivos={arquivos.get(o.id) ?? []} />)}</ul>
          ) : (
            <p className="text-sm text-mute">Nenhuma OS em andamento.</p>
          )}
        </section>

        {entregues.length > 0 && (
          <details className="painel p-5">
            <summary className="titulo cursor-pointer">Entregues <span className="text-sm font-normal text-mute">({entregues.length})</span></summary>
            <ul className="mt-4 space-y-3">{entregues.map((o) => <CartaoOS key={o.id} o={o} hj={hj} empresaId={emp.id} arquivos={arquivos.get(o.id) ?? []} />)}</ul>
          </details>
        )}
      </div>
    </>
  );
}

function Resumo({ rotulo, valor, cls }: { rotulo: string; valor: string; cls: string }) {
  return (
    <div className="painel p-4">
      <div className="text-xs text-mute">{rotulo}</div>
      <div className={`mt-1 font-display text-xl font-bold lg:text-2xl ${cls}`}><Valor>{valor}</Valor></div>
    </div>
  );
}

type Linha = Awaited<ReturnType<typeof carregarOS>>[number] & { total: number; pago: number; falta: number };

function CartaoOS({ o, hj, empresaId, arquivos }: { o: Linha; hj: string; empresaId: string; arquivos: Arquivo[] }) {
  const numero = String(o.numero).padStart(4, "0");
  const prazo = prazoInfo(o.prazo_entrega, hj, o.status);
  const msg =
    o.status === "pronta"
      ? `Olá, ${o.cliente}! Seu pedido (OS #${numero}) está pronto.${o.falta > 0 ? ` Valor restante: ${brl(o.falta)}.` : ""}`
      : `Olá, ${o.cliente}! Sobre a sua OS #${numero}.`;
  const whats = linkWhats(o.telefone, msg);

  return (
    <li className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm text-mute">OS #{numero}</span>
            <span className="font-medium text-ink">{o.cliente}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${corEtapa[o.status]}`}>{ETAPAS.find((e) => e.id === o.status)?.nome}</span>
          </div>
          <div className="mt-1 text-xs text-mute">
            Aberta em {dataBR(o.data)} · <span className={prazo.cls}>{prazo.texto}</span>
            {o.telefone && ` · ${o.telefone}`}
            {o.orcamento_id && ` · gerada de um orçamento aprovado`}
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-ink/80">
            {o.itens.map((it) => (
              <li key={it.id}>{it.quantidade}x {it.descricao} · <Valor>{brl(it.valor_unitario)}</Valor> un · <span className="text-ink"><Valor>{brl(it.valor_total)}</Valor></span></li>
            ))}
          </ul>
          {o.observacoes && <p className="mt-1 text-xs text-mute">Obs: {o.observacoes}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <div><div className="rotulo">Total</div><div className="font-display font-semibold text-ink"><Valor>{brl(o.total)}</Valor></div></div>
          <div><div className="rotulo">Pago</div><div className="font-display font-semibold text-ciano"><Valor>{brl(o.pago)}</Valor></div></div>
          <div>
            <div className="rotulo">Falta</div>
            <div className={`font-display text-lg font-bold ${o.falta > 0.005 ? "text-magenta" : "text-ciano"}`}><Valor>{o.falta > 0.005 ? brl(o.falta) : "Quitado"}</Valor></div>
          </div>
        </div>
      </div>

      <ArquivosOS osId={o.id} empresaId={empresaId} arquivos={arquivos} podeEditar />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <div className="flex overflow-hidden rounded-lg border border-line">
          {ETAPAS.map((e) => (
            <form key={e.id} action={statusOS}>
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="status" value={e.id} />
              <button
                className={`px-3 py-1.5 text-xs ${o.status === e.id ? "bg-ink font-semibold text-bg" : "text-mute hover:text-ink"}`}
                disabled={o.status === e.id}
              >
                {e.nome}
              </button>
            </form>
          ))}
        </div>

        {o.falta > 0.005 && o.pedido_id && (
          <form action={registrarPagamento} className="flex gap-1.5">
            <input type="hidden" name="pedido_id" value={o.pedido_id} />
            <input name="valor" defaultValue={o.falta.toFixed(2).replace(".", ",")} inputMode="decimal" className="campo w-24 py-1 text-sm" aria-label="Valor recebido" />
            <input name="data" type="date" defaultValue={hj} className="campo w-[130px] py-1 text-sm" aria-label="Data" />
            <Enviar className="botao2 py-1 text-sm">Receber</Enviar>
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          {whats && (
            <a href={whats} target="_blank" rel="noopener noreferrer" className="botao2 py-1 text-sm">WhatsApp</a>
          )}
          <a href={`/os/${o.id}/editar`} className="botao2 py-1 text-sm">Editar</a>
          <a href={`/os/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="botao2 py-1 text-sm">Imprimir OS</a>
          <Excluir action={excluirOS} id={o.id} texto={`Excluir a OS #${numero} de ${o.cliente}? O pedido e os pagamentos dela também saem.`} />
        </div>
      </div>
    </li>
  );
}
