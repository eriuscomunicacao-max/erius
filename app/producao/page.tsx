import Cabecalho from "@/components/Cabecalho";
import ArquivosOS from "@/components/ArquivosOS";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { arquivosPorOS } from "@/lib/arquivos";
import { dataBR, hoje } from "@/lib/format";
import { mudarStatusProducao } from "../producao-actions";

export const dynamic = "force-dynamic";

type OS = { id: string; numero: number; cliente: string; data: string; prazo_entrega: string | null; status: string; observacoes: string | null };
type Item = { id: string; os_id: string; servico: string; descricao: string; quantidade: number; ordem: number };

const ETAPA: Record<string, { nome: string; cls: string }> = {
  aberta: { nome: "Aberta", cls: "bg-amarelo/15 text-amarelo" },
  producao: { nome: "Em produção", cls: "bg-ciano/15 text-ciano" },
  pronta: { nome: "Pronta", cls: "bg-ink/10 text-ink" },
};

function prazoTxt(prazo: string | null, hj: string) {
  if (!prazo) return { texto: "Sem prazo", cls: "text-mute" };
  const dias = Math.round((Date.parse(prazo) - Date.parse(hj)) / 86_400_000);
  if (dias < 0) return { texto: `Atrasada ${-dias} dia(s) · ${dataBR(prazo)}`, cls: "font-semibold text-magenta" };
  if (dias === 0) return { texto: "Entrega HOJE", cls: "font-semibold text-amarelo" };
  if (dias === 1) return { texto: "Entrega amanhã", cls: "text-amarelo" };
  return { texto: `Entrega ${dataBR(prazo)}`, cls: "text-mute" };
}

export default async function Producao() {
  const [emp, papel] = await Promise.all([getEmpresa(), meuPapel()]);
  const s = db();
  const [{ data: os }, { data: itens }] = await Promise.all([s.rpc("producao_os"), s.rpc("producao_itens")]);
  const lista = (os ?? []) as OS[];
  const porOS = new Map<string, Item[]>();
  ((itens ?? []) as Item[]).forEach((i) => porOS.set(i.os_id, [...(porOS.get(i.os_id) ?? []), i]));
  const arquivos = await arquivosPorOS(lista.map((o) => o.id));
  const hj = hoje();

  return (
    <>
      <Cabecalho titulo="Produção" sub={`Ordens de serviço em andamento · ${emp.nome}`} />
      <div className="space-y-3 p-4 lg:p-5">
        {lista.length === 0 && <p className="painel p-5 text-sm text-mute">Nenhuma ordem de serviço em andamento. 🎉</p>}
        {lista.map((o) => {
          const prazo = prazoTxt(o.prazo_entrega, hj);
          const e = ETAPA[o.status] ?? ETAPA.aberta;
          return (
            <section key={o.id} className="painel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm text-mute">OS #{String(o.numero).padStart(4, "0")}</span>
                <span className="font-medium text-ink">{o.cliente}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${e.cls}`}>{e.nome}</span>
                <span className={`ml-auto text-sm ${prazo.cls}`}>{prazo.texto}</span>
              </div>
              <ul className="mt-3 space-y-1 text-[15px] text-ink">
                {(porOS.get(o.id) ?? []).map((i) => (
                  <li key={i.id}><b>{i.quantidade}x</b> {i.descricao} <span className="text-xs text-mute">({i.servico})</span></li>
                ))}
              </ul>
              {o.observacoes && <p className="mt-2 rounded-lg border border-line p-2 text-sm text-ink/90">Obs: {o.observacoes}</p>}
              <ArquivosOS osId={o.id} empresaId={emp.id} arquivos={arquivos.get(o.id) ?? []} podeEditar={false} />
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {o.status === "aberta" && <Botao id={o.id} status="producao">Iniciar produção</Botao>}
                {o.status === "producao" && <Botao id={o.id} status="pronta">Marcar como pronta</Botao>}
                {o.status === "pronta" && <Botao id={o.id} status="producao" secundario>Voltar para produção</Botao>}
              </div>
            </section>
          );
        })}
        {papel === "dono" && <p className="text-xs text-mute">Esta é a tela que o funcionário vê.</p>}
      </div>
    </>
  );
}

function Botao({ id, status, children, secundario }: { id: string; status: string; children: React.ReactNode; secundario?: boolean }) {
  return (
    <form action={mudarStatusProducao}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={secundario ? "botao2" : "botao"}>{children}</button>
    </form>
  );
}
