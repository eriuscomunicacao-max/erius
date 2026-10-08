"use client";
import { useMemo, useState } from "react";
import { Valor } from "@/components/Privacidade";

type Preco = { tamanho: string; quantidade: number; preco: number };
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const n = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

export default function Calculadora({ precos, markup }: { precos: Preco[]; markup: number }) {
  const tamanhos = useMemo(() => [...new Set(precos.map((p) => p.tamanho))].sort((a, b) => parseFloat(a) - parseFloat(b)), [precos]);
  const [tam, setTam] = useState(tamanhos[0] ?? "");
  const [qtd, setQtd] = useState("500");
  const [custo, setCusto] = useState("");
  const [mk, setMk] = useState(String(markup));

  const preco = useMemo(() => {
    const rows = precos.filter((p) => p.tamanho === tam).sort((a, b) => a.quantidade - b.quantidade);
    const q = n(qtd);
    if (!rows.length || !q) return 0;
    const exato = rows.find((r) => r.quantidade === q);
    if (exato) return exato.preco;
    let a = rows[0], b = rows[rows.length - 1];
    if (q < a.quantidade) b = rows[1] ?? a;
    else if (q > b.quantidade) a = rows[rows.length - 2] ?? b;
    else for (let i = 0; i < rows.length - 1; i++) if (rows[i].quantidade < q && rows[i + 1].quantidade > q) { a = rows[i]; b = rows[i + 1]; }
    if (a.quantidade === b.quantidade) return a.preco;
    return a.preco + ((b.preco - a.preco) * (q - a.quantidade)) / (b.quantidade - a.quantidade);
  }, [precos, tam, qtd]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-line p-4">
        <div className="mb-3 font-display font-semibold">Orçamento de etiquetas</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="c-tam">Tamanho</label>
            <select id="c-tam" value={tam} onChange={(e) => setTam(e.target.value)} className="campo">
              {tamanhos.map((t) => <option key={t} value={t}>{t} cm</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="c-qtd">Quantidade</label>
            <input id="c-qtd" value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="numeric" className="campo" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-mute">Preço</span>
          <span className="font-display text-2xl font-bold text-verde"><Valor>{brl(preco)}</Valor></span>
        </div>
        <div className="text-right text-xs text-mute"><Valor>{brl(n(qtd) ? preco / n(qtd) : 0)}</Valor> por unidade{n(qtd) < 100 && " · abaixo do mínimo de 100un"}</div>
      </div>
      <div className="rounded-lg border border-line p-4">
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
    </div>
  );
}
