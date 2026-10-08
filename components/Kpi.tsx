import { ISeta } from "./Icones";
import { Valor } from "./Privacidade";

export default function Kpi({
  titulo, valor, variacao, cor, Icone, inverso, rodape,
}: {
  titulo: string; valor: string; variacao: number | null; cor: string;
  Icone: (p: { className?: string }) => JSX.Element; inverso?: boolean;
  rodape?: { rotulo: string; valor: string };
}) {
  const sobe = (variacao ?? 0) >= 0;
  const bom = inverso ? !sobe : sobe;
  return (
    <div className="painel p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${cor}26`, color: cor }}>
          <Icone className="h-6 w-6" />
        </span>
        <span className="text-[15px] text-ink/90">{titulo}</span>
      </div>
      <div className="mt-4 font-display text-[30px] font-bold leading-none text-ink"><Valor>{valor}</Valor></div>
      <div className="mt-3 flex items-center gap-1.5 text-[15px] font-semibold">
        {variacao === null ? (
          <span className="text-mute">sem mês anterior</span>
        ) : (
          <span className={`flex items-center gap-1 ${bom ? "text-verde" : "text-vermelho"}`}>
            <ISeta baixo={!sobe} className="h-4 w-4" />
            {Math.abs(Math.round(variacao * 100))}%
          </span>
        )}
      </div>
      {variacao !== null && <div className="mt-1 text-xs text-mute">vs. mês anterior</div>}
      {rodape && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="text-mute">{rodape.rotulo}</span>
          <span className="font-display font-semibold text-ink"><Valor>{rodape.valor}</Valor></span>
        </div>
      )}
    </div>
  );
}
