"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarOrcamento, atualizarOrcamento } from "@/app/actions";
import { totalItem, rotuloUnidade, type Produto } from "@/lib/produtos";
import { SERVICOS } from "@/lib/constants";
import { Valor } from "@/components/Privacidade";
import { parseMedidas, fmtM2 } from "@/lib/medidas";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const parseBR = (s: string) => {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const x = Number(t);
  return isFinite(x) ? x : 0;
};
const r2 = (v: number) => Math.round(v * 100) / 100;
const txtBR = (v: number) => (v ? String(v).replace(".", ",") : "");

// Um item do orçamento. produto_id = null → item avulso (digitado na hora)
type Item = {
  produto_id: string | null;
  servico: string;
  unidade: string;
  descricao: string;      // nome do item (avulso) ou complemento (produto do catálogo)
  nomeProduto: string;
  tamanho: string | null; // preservado ao editar
  qtdTxt: string;
  precoTxt: string;
  largTxt: string;
  altTxt: string;
  fixo?: number;          // total original (ao editar) até mexer em qtd/preço
  lote?: boolean;         // modo "metragem total": lista de medidas somada, preço por m²
  medidasTxt?: string;    // uma medida por linha (ex: 0,45x0,80 x2)
};

type Padroes = { prazo: string; pagamento: string; validade: number; adicional: number };
type Inicial = {
  id: string; cliente: string; data: string; validade_dias: number; prazo: string | null; pagamento: string | null;
  observacoes: string | null; bonificacao: string | null; producao_prioritaria: boolean;
  itens: { tipo: string; servico: string; tamanho: string | null; quantidade: number; descricao: string | null; valor_unitario: number; valor_total: number; medidas?: string | null }[];
};

const itemAvulso = (): Item => ({
  produto_id: null, servico: SERVICOS[0], unidade: "un", descricao: "", nomeProduto: "", tamanho: null,
  qtdTxt: "1", precoTxt: "", largTxt: "", altTxt: "",
});
const itemLote = (): Item => ({ ...itemAvulso(), unidade: "m²", lote: true, medidasTxt: "" });
const itemDoProduto = (p: Produto): Item => ({
  produto_id: p.id, servico: p.categoria, unidade: p.unidade, descricao: "", nomeProduto: p.nome, tamanho: null,
  qtdTxt: p.unidade === "milheiro" ? "1000" : "1", precoTxt: txtBR(p.preco), largTxt: "", altTxt: "",
});

const qtdDe = (it: Item) => Math.max(0, parseBR(it.qtdTxt));
const totalDe = (it: Item) =>
  it.fixo ??
  (it.lote
    ? r2(parseMedidas(it.medidasTxt ?? "").areaTotal * parseBR(it.precoTxt))
    : totalItem(it.unidade, parseBR(it.precoTxt), qtdDe(it), parseBR(it.largTxt), parseBR(it.altTxt)));
const nomeDe = (it: Item) =>
  it.produto_id ? [it.nomeProduto, it.descricao.trim()].filter(Boolean).join(" · ") : it.descricao.trim();

export default function NovoOrcamento({ produtos, padroes, inicial }: { produtos: Produto[]; padroes: Padroes; inicial?: Inicial }) {
  const router = useRouter();
  const editando = !!inicial;
  const [cliente, setCliente] = useState(inicial?.cliente ?? "");
  const [itens, setItens] = useState<Item[]>(() =>
    (inicial?.itens ?? []).map((it) => {
      const lote = !!it.medidas;
      const area = lote ? parseMedidas(it.medidas!).areaTotal : 0;
      return {
        ...itemAvulso(),
        servico: it.servico,
        descricao: it.tipo === "etiqueta" ? `Etiqueta ${it.tamanho ?? ""} ${it.descricao ?? ""}`.trim() : it.descricao ?? "",
        tamanho: it.tamanho,
        qtdTxt: String(it.quantidade),
        precoTxt: lote ? txtBR(area ? r2(it.valor_total / area) : 0) : txtBR(r2(it.valor_total / (it.quantidade || 1))),
        fixo: it.valor_total,
        ...(lote ? { lote: true, unidade: "m²", medidasTxt: it.medidas! } : {}),
      };
    })
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const mudar = (i: number, patch: Partial<Item>) =>
    setItens((v) =>
      v.map((it, idx) => {
        if (idx !== i) return it;
        const novo = { ...it, ...patch };
        if ("qtdTxt" in patch || "precoTxt" in patch || "largTxt" in patch || "altTxt" in patch || "medidasTxt" in patch) delete novo.fixo;
        return novo;
      })
    );

  function escolherProduto(i: number, id: string) {
    const p = produtos.find((x) => x.id === id);
    setItens((v) =>
      v.map((it, idx) => {
        if (idx !== i) return it;
        if (it.lote) {
          // no modo metragem total o produto só define nome e preço por m²
          const base = p ? itemDoProduto(p) : { ...itemAvulso(), unidade: "m²" };
          return { ...base, unidade: "m²", qtdTxt: "1", lote: true, medidasTxt: it.medidasTxt ?? "" };
        }
        return p ? itemDoProduto(p) : { ...itemAvulso(), qtdTxt: it.qtdTxt };
      })
    );
  }

  const total = itens.reduce((s, i) => s + totalDe(i), 0);

  async function salvar() {
    if (!cliente.trim()) return setErro("Informe o cliente.");
    if (!itens.length) return setErro("Adicione ao menos um item.");
    for (const it of itens) {
      if (!nomeDe(it)) return setErro("Dê um nome/descrição para todos os itens.");
      if (it.lote) {
        const m = parseMedidas(it.medidasTxt ?? "");
        if (!m.areaTotal) return setErro("Digite as medidas da metragem total (uma por linha, ex: 0,45x0,80).");
        if (m.invalidas.length) return setErro(`Não entendi estas medidas: ${m.invalidas.slice(0, 3).join(" | ")}`);
        continue;
      }
      if (!qtdDe(it)) return setErro("Informe a quantidade de todos os itens.");
      if (it.unidade === "m²" && (!parseBR(it.largTxt) || !parseBR(it.altTxt))) return setErro("Informe largura e altura (em metros) dos itens cobrados por m².");
    }
    setErro("");
    setSalvando(true);
    const fd = new FormData(formRef.current!);
    const payload = itens.map((it) => {
      const vt = r2(totalDe(it));
      if (it.lote) {
        const m = parseMedidas(it.medidasTxt ?? "");
        return {
          tipo: "manual" as const,
          servico: it.servico,
          tamanho: `${fmtM2(m.areaTotal)} m²`,
          quantidade: 1,
          descricao: nomeDe(it),
          valor_unitario: vt,
          valor_total: vt,
          medidas: (it.medidasTxt ?? "").trim(),
        };
      }
      const q = qtdDe(it);
      return {
        tipo: "manual" as const,
        servico: it.servico,
        tamanho: it.unidade === "m²" ? `${it.largTxt} x ${it.altTxt} m` : it.tamanho,
        quantidade: Math.max(1, Math.round(q)),
        descricao: nomeDe(it),
        valor_unitario: q ? r2(vt / q) : vt,
        valor_total: vt,
      };
    });
    fd.set("itens", JSON.stringify(payload));
    try {
      if (editando) {
        fd.set("id", String(inicial!.id));
        await atualizarOrcamento(fd);
        router.push("/orcamentos");
        return;
      }
      await criarOrcamento(fd);
      setCliente("");
      setItens([]);
      formRef.current?.reset();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2">
          <label className="rotulo" htmlFor="cliente">Cliente</label>
          <input id="cliente" name="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} required className="campo" placeholder="Nome do cliente" />
        </div>
        <div>
          <label className="rotulo" htmlFor="data">Data</label>
          <input id="data" name="data" type="date" defaultValue={inicial?.data ?? new Date().toISOString().slice(0, 10)} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="validade_dias">Validade (dias)</label>
          <input id="validade_dias" name="validade_dias" defaultValue={String(inicial?.validade_dias ?? padroes.validade)} inputMode="numeric" className="campo" />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="prazo">Prazo de produção</label>
          <input id="prazo" name="prazo" defaultValue={inicial ? inicial.prazo ?? "" : padroes.prazo} className="campo" />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="pagamento">Forma de pagamento</label>
          <input id="pagamento" name="pagamento" defaultValue={inicial ? inicial.pagamento ?? "" : padroes.pagamento} className="campo" />
        </div>
        {padroes.adicional > 0 && (
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="producao_prioritaria" defaultChecked={inicial ? inicial.producao_prioritaria : false} className="h-4 w-4 accent-ciano" />
            <span>Oferecer produção prioritária (+<Valor>{brl(padroes.adicional)}</Valor>)</span>
          </label>
        )}
        <div className="col-span-2 md:col-span-2">
          <label className="rotulo" htmlFor="bonificacao">Bonificação (opcional)</label>
          <input id="bonificacao" name="bonificacao" defaultValue={inicial?.bonificacao ?? ""} className="campo" placeholder="Ex: brinde ou item extra, sem alteração no valor" />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="rotulo" htmlFor="observacoes">Observações (opcional)</label>
          <input id="observacoes" name="observacoes" defaultValue={inicial?.observacoes ?? ""} className="campo" />
        </div>
      </div>

      <div className="rounded-lg border border-line">
        <div className="flex items-center justify-between border-b border-line p-3">
          <span className="text-sm font-semibold text-ink">Itens do orçamento</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setItens((v) => [...v, itemAvulso()])} className="botao2 py-1 text-xs">+ Adicionar item</button>
            <button type="button" onClick={() => setItens((v) => [...v, itemLote()])} className="botao2 py-1 text-xs">+ Metragem total</button>
          </div>
        </div>
        {itens.length === 0 ? (
          <p className="p-4 text-sm text-mute">
            Nenhum item ainda. Clique em &quot;Adicionar item&quot; e escolha um produto do seu catálogo{produtos.length === 0 && " (cadastre em Produtos e serviços)"} ou digite um item avulso.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((it, i) => it.lote ? (
              <li key={i} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-12">
                <div className="col-span-2 md:col-span-4">
                  <label className="rotulo">Produto / serviço (por m²)</label>
                  <select className="campo" value={it.produto_id ?? ""} onChange={(e) => escolherProduto(i, e.target.value)}>
                    <option value="">Item avulso (digitar)</option>
                    {produtos.filter((p) => p.unidade === "m²").map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <div className="mt-1 text-[11px] text-mute">Metragem total · o PDF mostra uma linha só</div>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <label className="rotulo">{it.produto_id ? "Complemento (opcional)" : "Descrição do item"}</label>
                  <input className="campo" value={it.descricao} onChange={(e) => mudar(i, { descricao: e.target.value })} placeholder={it.produto_id ? "Ex: fosco" : "Ex: Impressão digital · adesivo fosco"} />
                </div>
                <div className="md:col-span-2">
                  <label className="rotulo">Preço (m²) (R$)</label>
                  <input className="campo" inputMode="decimal" value={it.precoTxt} onChange={(e) => mudar(i, { precoTxt: e.target.value })} placeholder="0,00" />
                </div>
                <div className="col-span-2 flex items-end justify-between gap-2 md:col-span-2">
                  <span className="pb-2 font-display font-semibold text-ciano"><Valor>{brl(totalDe(it))}</Valor></span>
                  <button type="button" onClick={() => setItens((v) => v.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-mute hover:bg-magenta/15 hover:text-magenta" aria-label="Remover item">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </div>
                <div className="col-span-2 md:col-span-12">
                  <label className="rotulo">Medidas em metros, uma por linha (use &quot;x2&quot; no fim para repetir; &quot;cm&quot; converte)</label>
                  <textarea
                    className="campo font-mono text-sm"
                    rows={6}
                    value={it.medidasTxt ?? ""}
                    onChange={(e) => mudar(i, { medidasTxt: e.target.value })}
                    placeholder={"0,45 x 0,80\n0,50 x 0,60 x2\n0,30 x 0,30 x10"}
                  />
                  {(() => {
                    const m = parseMedidas(it.medidasTxt ?? "");
                    return (
                      <div className="mt-1 text-xs text-mute">
                        {m.linhas} {m.linhas === 1 ? "medida" : "medidas"} · {m.pecas} {m.pecas === 1 ? "peça" : "peças"} · <strong className="text-ink">{fmtM2(m.areaTotal)} m²</strong> no total
                        {m.invalidas.length > 0 && <span className="text-magenta"> · não entendi: {m.invalidas.slice(0, 3).join(" | ")}</span>}
                      </div>
                    );
                  })()}
                </div>
              </li>
            ) : (
              <li key={i} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-12">
                <div className="col-span-2 md:col-span-4">
                  <label className="rotulo">Produto / serviço</label>
                  <select className="campo" value={it.produto_id ?? ""} onChange={(e) => escolherProduto(i, e.target.value)}>
                    <option value="">Item avulso (digitar)</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  {it.produto_id && <div className="mt-1 text-[11px] text-mute">Cobrado {rotuloUnidade(it.unidade)}</div>}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="rotulo">{it.produto_id ? "Complemento (opcional)" : "Descrição do item"}</label>
                  <input className="campo" value={it.descricao} onChange={(e) => mudar(i, { descricao: e.target.value })} placeholder={it.produto_id ? "Ex: fosco, 4x4 cores" : "O que é o item"} />
                </div>
                {it.unidade === "m²" && (
                  <>
                    <div className="md:col-span-1">
                      <label className="rotulo">Larg. (m)</label>
                      <input className="campo" inputMode="decimal" value={it.largTxt} onChange={(e) => mudar(i, { largTxt: e.target.value })} placeholder="1,00" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="rotulo">Alt. (m)</label>
                      <input className="campo" inputMode="decimal" value={it.altTxt} onChange={(e) => mudar(i, { altTxt: e.target.value })} placeholder="2,00" />
                    </div>
                  </>
                )}
                <div className="md:col-span-1">
                  <label className="rotulo">Qtd</label>
                  <input className="campo" inputMode="decimal" value={it.qtdTxt} onChange={(e) => mudar(i, { qtdTxt: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="rotulo">Preço {it.unidade !== "un" ? `(${it.unidade})` : ""} (R$)</label>
                  <input className="campo" inputMode="decimal" value={it.precoTxt} onChange={(e) => mudar(i, { precoTxt: e.target.value })} placeholder="0,00" />
                </div>
                <div className="col-span-2 flex items-end justify-between gap-2 md:col-span-1">
                  <span className="pb-2 font-display font-semibold text-ciano"><Valor>{brl(totalDe(it))}</Valor></span>
                  <button type="button" onClick={() => setItens((v) => v.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-mute hover:bg-magenta/15 hover:text-magenta" aria-label="Remover item">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {itens.length > 0 && (
          <div className="flex items-center justify-between border-t border-line p-3">
            <span className="text-sm text-mute">Total do orçamento</span>
            <span className="font-display text-lg font-bold text-ink"><Valor>{brl(total)}</Valor></span>
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-magenta" role="alert">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className="botao disabled:opacity-60">
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar orçamento"}
        </button>
        {editando && <a href="/orcamentos" className="botao2">Cancelar</a>}
      </div>
    </form>
  );
}
