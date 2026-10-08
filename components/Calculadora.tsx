"use client";
import { useState } from "react";
import { Valor } from "@/components/Privacidade";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const n = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

// Revenda (terceirizado): custo do fornecedor + markup = preço de venda
export default function Calculadora({ markup }: { markup: number }) {
  const [custo, setCusto] = useState("");
  const [mk, setMk] = useState(String(markup));
  return (
    <div className="max-w-xl rounded-lg border border-line p-4">
      <div className="mb-3 font-display font-semibold">Revenda (terceirizado)</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo" htmlFor="c-custo">Custo do fornecedor (R$)</label>
          <input id="c-custo" value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" className="campo" placeholder="100,00" />
        </div>
        <div>
          <label className="rotulo" htmlFor="c-mk">Markup (%)</label>
          <input id="c-mk" value={mk} onChange={(e) => setMk(e.target.value)} inputMode="decimal" className="campo" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-mute">Preço de venda</span>
        <span className="font-display text-2xl font-bold text-verde"><Valor>{brl(n(custo) * (1 + n(mk) / 100))}</Valor></span>
      </div>
      <div className="text-right text-xs text-mute">Lucro de <Valor>{brl(n(custo) * (n(mk) / 100))}</Valor></div>
    </div>
  );
}
