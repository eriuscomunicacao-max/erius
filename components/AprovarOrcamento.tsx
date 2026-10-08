"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { aprovarOrcamentoEmOS } from "@/app/actions";
import { FORMAS } from "@/lib/constants";
import { Valor } from "@/components/Privacidade";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const parse = (s: string) => {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const x = Number(t);
  return isFinite(x) ? x : 0;
};

function Gerar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="botao py-1.5 text-sm disabled:opacity-60">
      {pending ? "Gerando OS..." : "Confirmar e gerar OS"}
    </button>
  );
}

export default function AprovarOrcamento({ id, total, hoje }: { id: string; total: number; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [pagou50, setPagou50] = useState<"sim" | "nao">("nao");
  const [editado, setEditado] = useState(false);
  const [pagoTxt, setPagoTxt] = useState("");

  const metade = Math.round(total * 50) / 100;
  const pago = pagou50 === "sim" ? (editado ? parse(pagoTxt) : metade) : 0;
  const falta = total - pago;

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="botao py-1.5 text-sm">
        Aprovado — gerar OS
      </button>
    );
  }

  return (
    <form action={aprovarOrcamentoEmOS} className="w-full space-y-3 rounded-lg border border-ciano/40 bg-ciano/5 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="valor_pago" value={String(pago)} />
      <p className="text-sm font-semibold text-ink">Gerar OS a partir deste orçamento</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="rotulo" htmlFor={`prazo-${id}`}>Prazo de entrega</label>
          <input id={`prazo-${id}`} name="prazo_entrega" type="date" required min={hoje} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor={`tel-${id}`}>WhatsApp</label>
          <input id={`tel-${id}`} name="telefone" inputMode="tel" className="campo" placeholder="(19) 99999-9999" />
        </div>
        <div>
          <label className="rotulo" htmlFor={`forma-${id}`}>Pagamento</label>
          <select id={`forma-${id}`} name="forma_pagto" className="campo">{FORMAS.map((f) => <option key={f}>{f}</option>)}</select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="rotulo">Cliente pagou 50% do valor total?</span>
          <div className="flex gap-2">
            {(["sim", "nao"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => { setPagou50(op); setEditado(false); setPagoTxt(""); }}
                className={`rounded-lg border px-4 py-1.5 text-sm font-semibold ${
                  pagou50 === op
                    ? op === "sim" ? "border-ciano bg-ciano/15 text-ciano" : "border-magenta bg-magenta/15 text-magenta"
                    : "border-line text-mute hover:border-mute"
                }`}
              >
                {op === "sim" ? "Sim" : "Não"}
              </button>
            ))}
          </div>
        </div>
        {pagou50 === "sim" && (
          <div>
            <label className="rotulo" htmlFor={`pago-${id}`}>Valor pago (altere se for diferente)</label>
            <input
              id={`pago-${id}`}
              inputMode="decimal"
              className="campo w-32"
              value={editado ? pagoTxt : metade.toFixed(2).replace(".", ",")}
              onChange={(e) => { setEditado(true); setPagoTxt(e.target.value); }}
            />
          </div>
        )}
        <div className="ml-auto flex gap-5 text-right">
          <div><div className="rotulo">Total</div><div className="font-display font-semibold text-ink"><Valor>{brl(total)}</Valor></div></div>
          <div><div className="rotulo">Pago</div><div className="font-display font-semibold text-ciano"><Valor>{brl(pago)}</Valor></div></div>
          <div>
            <div className="rotulo">Falta</div>
            <div className={`font-display font-bold ${falta > 0.005 ? "text-magenta" : "text-ciano"}`}><Valor>{falta > 0.005 ? brl(falta) : "Quitado"}</Valor></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Gerar />
        <button type="button" onClick={() => setAberto(false)} className="botao2 text-sm">Cancelar</button>
      </div>
    </form>
  );
}
