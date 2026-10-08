"use client";
import { recusarOrcamento, excluirOrcamento } from "@/app/actions";
import AprovarOrcamento from "./AprovarOrcamento";
import { useFormStatus } from "react-dom";
import { Valor } from "@/components/Privacidade";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

type Item = { id: string; tipo: string; servico: string; tamanho: string | null; quantidade: number; descricao: string | null; valor_total: number };
type Orc = { id: string; numero: number; cliente: string; data: string; status: "pendente" | "aprovado" | "recusado"; validade_dias: number; itens: Item[] };

const corStatus: Record<string, string> = {
  pendente: "bg-amarelo/15 text-amarelo",
  aprovado: "bg-ciano/15 text-ciano",
  recusado: "bg-magenta/15 text-magenta",
};
const rotStatus: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado" };

function BotaoAcao({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>{pending ? "..." : children}</button>;
}

export default function ListaOrcamentos({ orcamentos, hoje }: { orcamentos: Orc[]; hoje: string }) {
  if (!orcamentos.length) return <p className="text-sm text-mute">Nenhum orçamento ainda.</p>;

  return (
    <ul className="space-y-3">
      {orcamentos.map((o) => {
        const total = o.itens.reduce((s, i) => s + i.valor_total, 0);
        return (
          <li key={o.id} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{o.cliente}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${corStatus[o.status]}`}>{rotStatus[o.status]}</span>
                </div>
                <div className="mt-1 text-xs text-mute">
                  {dataBR(o.data)} · válido por {o.validade_dias} dias · #{String(o.numero).padStart(4, "0")}
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-ink/80">
                  {o.itens.map((it) => (
                    <li key={it.id}>
                      {it.tipo === "etiqueta" ? `Etiqueta ${it.tamanho}` : it.servico}
                      {it.descricao && ` · ${it.descricao}`} · {it.quantidade} un · <Valor>{brl(it.valor_total)}</Valor>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold text-ink"><Valor>{brl(total)}</Valor></div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`/orcamentos/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="botao2 py-1.5 text-sm">
                Exportar PDF
              </a>
              <a href={`/orcamentos/${o.id}/editar`} className="botao2 py-1.5 text-sm">Editar</a>
              {o.status === "pendente" && (
                <>
                  <AprovarOrcamento id={o.id} total={total} hoje={hoje} />
                  <form action={recusarOrcamento}>
                    <input type="hidden" name="id" value={o.id} />
                    <BotaoAcao className="botao2 py-1.5 text-sm text-magenta">Recusar</BotaoAcao>
                  </form>
                </>
              )}
              <form action={excluirOrcamento} onSubmit={(e) => { if (!confirm(`Excluir o orçamento de ${o.cliente}?`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={o.id} />
                <BotaoAcao className="rounded p-1.5 text-mute hover:bg-magenta/15 hover:text-magenta">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                </BotaoAcao>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
