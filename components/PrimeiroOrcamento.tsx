"use client";
import { useState } from "react";
import Enviar from "@/components/Enviar";
import { totalItem, rotuloUnidade } from "@/lib/produtos";

type P = { id: string; nome: string; unidade: string; preco: number };

const parseBR = (s: string) => {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const x = Number(t);
  return isFinite(x) && x >= 0 ? x : 0;
};
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function PrimeiroOrcamento({ produtos, action }: { produtos: P[]; action: (fd: FormData) => void | Promise<void> }) {
  const [pid, setPid] = useState(produtos[0]?.id ?? "");
  const [qtd, setQtd] = useState(produtos[0]?.unidade === "milheiro" ? "1000" : "1");
  const [larg, setLarg] = useState("");
  const [alt, setAlt] = useState("");
  const p = produtos.find((x) => x.id === pid);
  const total = p ? totalItem(p.unidade, p.preco, parseBR(qtd), parseBR(larg), parseBR(alt)) : 0;

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="rotulo" htmlFor="cliente">Nome do cliente</label>
        <input id="cliente" name="cliente" required maxLength={80} className="campo" placeholder="Ex: Padaria Central" />
      </div>
      <div>
        <label className="rotulo" htmlFor="produto_id">O que você vai vender a ele</label>
        <select
          id="produto_id" name="produto_id" className="campo" value={pid}
          onChange={(e) => {
            const novo = produtos.find((x) => x.id === e.target.value);
            setPid(e.target.value);
            setQtd(novo?.unidade === "milheiro" ? "1000" : "1");
          }}
        >
          {produtos.map((x) => <option key={x.id} value={x.id}>{x.nome} ({brl(x.preco)} {rotuloUnidade(x.unidade).replace("por ", "/")})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {p?.unidade === "m²" && (
          <>
            <div>
              <label className="rotulo" htmlFor="largura">Largura (m)</label>
              <input id="largura" name="largura" inputMode="decimal" value={larg} onChange={(e) => setLarg(e.target.value)} className="campo" placeholder="1,50" required />
            </div>
            <div>
              <label className="rotulo" htmlFor="altura">Altura (m)</label>
              <input id="altura" name="altura" inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} className="campo" placeholder="2,00" required />
            </div>
          </>
        )}
        <div className={p?.unidade === "m²" ? "col-span-2" : "col-span-2 sm:col-span-1"}>
          <label className="rotulo" htmlFor="quantidade">Quantidade</label>
          <input id="quantidade" name="quantidade" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} className="campo" required />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-line p-3">
        <span className="text-sm text-mute">Total do orçamento</span>
        <span className="font-display text-xl font-bold text-ciano">{brl(total)}</span>
      </div>
      <Enviar>Criar meu primeiro orçamento</Enviar>
    </form>
  );
}
