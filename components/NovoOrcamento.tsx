"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarOrcamento, atualizarOrcamento } from "@/app/actions";
import { precoSugerido, lerMedida, type PrecoTabela } from "@/lib/precos";
import { SERVICOS } from "@/lib/constants";
import { Valor } from "@/components/Privacidade";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type Item = {
  tipo: "etiqueta" | "manual";
  servico: string;
  tamanho: string | null;
  quantidade: number;
  descricao: string | null;
  valor_unitario: number;
  valor_total: number;
  outra?: boolean;       // medida fora da tabela (ex: 5x3)
  medidaTxt?: string;    // o que foi digitado na medida livre
  sugerido?: number;     // preço total sugerido pela tabela
  manualTxt?: string;    // preço total digitado por você (vazio = usa o sugerido)
  qtdTxt?: string;
};
const parseBR = (s: string) => {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const x = Number(t);
  return isFinite(x) ? x : 0;
};
const r2 = (v: number) => Math.round(v * 100) / 100;
const CAIXA_ENVIO = 2; // R$ por pedido (caixa custa R$1,50 → sobra R$0,50)

type Inicial = {
  id: string; cliente: string; data: string; validade_dias: number; prazo: string | null; pagamento: string | null;
  observacoes: string | null; bonificacao: string | null; producao_prioritaria: boolean;
  itens: { tipo: "etiqueta" | "manual"; servico: string; tamanho: string | null; quantidade: number; descricao: string | null; valor_unitario: number; valor_total: number }[];
};

export default function NovoOrcamento({ precos, inicial }: { precos: PrecoTabela[]; inicial?: Inicial }) {
  const tamanhos = [...new Set(precos.map((p) => p.tamanho))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const router = useRouter();
  const editando = !!inicial;
  const [cliente, setCliente] = useState(inicial?.cliente ?? "");
  const [itens, setItens] = useState<Item[]>(() =>
    (inicial?.itens ?? []).map((it) => {
      if (it.tipo !== "etiqueta") return { ...it };
      const tam = it.tamanho ?? "";
      const outra = !tamanhos.includes(tam);
      // mantém o preço que já estava no orçamento
      return {
        ...it, outra, medidaTxt: outra ? tam : "", qtdTxt: String(it.quantidade),
        sugerido: tam ? r2(precoSugerido(precos, tam, it.quantidade)) : 0,
        manualTxt: it.valor_total.toFixed(2).replace(".", ","),
      };
    })
  );
  const [caixa, setCaixa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function addEtiqueta() {
    const tamanho = tamanhos[0] ?? "5x5";
    const quantidade = 100;
    const sug = r2(precoSugerido(precos, tamanho, quantidade));
    setItens((v) => [...v, {
      tipo: "etiqueta", servico: "Etiquetas", tamanho, quantidade, descricao: null,
      valor_unitario: quantidade ? sug / quantidade : 0, valor_total: sug,
      outra: false, medidaTxt: "", sugerido: sug, manualTxt: "", qtdTxt: String(quantidade),
    }]);
  }
  function addManual() {
    setItens((v) => [...v, { tipo: "manual", servico: SERVICOS[0], tamanho: null, quantidade: 1, descricao: "", valor_unitario: 0, valor_total: 0 }]);
  }
  function remover(i: number) {
    setItens((v) => v.filter((_, idx) => idx !== i));
  }
  function atualizar(i: number, patch: Partial<Item>) {
    setItens((v) => {
      const novo = [...v];
      const it = { ...novo[i], ...patch };
      if (it.tipo === "etiqueta") {
        if (patch.qtdTxt !== undefined) it.quantidade = Math.max(0, Math.round(parseBR(patch.qtdTxt)));
        if (it.outra) {
          const med = lerMedida(it.medidaTxt ?? "");
          it.tamanho = med ? med.texto : (it.medidaTxt ?? "").trim() || null;
        }
        it.sugerido = it.tamanho ? r2(precoSugerido(precos, it.tamanho, it.quantidade)) : 0;
        const manual = (it.manualTxt ?? "").trim() ? parseBR(it.manualTxt!) : null;
        it.valor_total = r2(manual ?? it.sugerido);
        it.valor_unitario = it.quantidade ? it.valor_total / it.quantidade : 0;
      } else if (it.tipo === "manual") {
        it.valor_total = it.valor_unitario * (it.quantidade || 1);
      }
      novo[i] = it;
      return novo;
    });
  }

  const total = itens.reduce((s, i) => s + i.valor_total, 0) + (caixa ? CAIXA_ENVIO : 0);

  async function salvar() {
    if (!cliente.trim()) return setErro("Informe o cliente.");
    if (!itens.length) return setErro("Adicione ao menos um item.");
    if (itens.some((i) => i.tipo === "etiqueta" && (!i.tamanho || !lerMedida(i.tamanho)))) return setErro("Informe a medida da etiqueta (ex: 5x3).");
    if (itens.some((i) => i.tipo === "etiqueta" && !i.quantidade)) return setErro("Informe a quantidade da etiqueta.");
    setErro("");
    setSalvando(true);
    const fd = new FormData(formRef.current!);
    // Caixa de envio: não aparece como item; os R$2 são somados direto no valor do primeiro item (etiqueta, se houver)
    const alvo = Math.max(0, itens.findIndex((i) => i.tipo === "etiqueta"));
    const itensFinal: Item[] = caixa
      ? itens.map((it, idx) => {
          if (idx !== alvo) return it;
          const vt = r2(it.valor_total + CAIXA_ENVIO);
          return { ...it, valor_total: vt, valor_unitario: vt / (it.quantidade || 1) };
        })
      : itens;
    fd.set("itens", JSON.stringify(itensFinal));
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
      setCaixa(false);
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
          <input id="validade_dias" name="validade_dias" defaultValue={String(inicial?.validade_dias ?? 15)} inputMode="numeric" className="campo" />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="prazo">Prazo de produção</label>
          <input id="prazo" name="prazo" defaultValue={inicial ? inicial.prazo ?? "" : "5 dias úteis após aprovação da arte"} className="campo" />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="pagamento">Forma de pagamento</label>
          <input id="pagamento" name="pagamento" defaultValue={inicial ? inicial.pagamento ?? "" : "50% na aprovação e 50% na entrega | PIX"} className="campo" />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="producao_prioritaria" defaultChecked={inicial ? inicial.producao_prioritaria : true} className="h-4 w-4 accent-ciano" />
          Oferecer produção prioritária (48h)
        </label>
        <div className="col-span-2 md:col-span-2">
          <label className="rotulo" htmlFor="bonificacao">Bonificação (opcional)</label>
          <input
            id="bonificacao"
            name="bonificacao"
            defaultValue={inicial?.bonificacao ?? ""}
            className="campo"
            placeholder="Ex: serão enviadas algumas etiquetas a mais, sem alteração no valor"
          />
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
            <button type="button" onClick={addEtiqueta} className="botao2 py-1 text-xs">+ Etiqueta (tabela)</button>
            <button type="button" onClick={addManual} className="botao2 py-1 text-xs">+ Item manual</button>
          </div>
        </div>
        {itens.length === 0 ? (
          <p className="p-4 text-sm text-mute">Nenhum item ainda. Adicione etiquetas (preço automático) ou um item manual (preço digitado).</p>
        ) : (
          <ul className="divide-y divide-line">
            {itens.map((it, i) => (
              <li key={i} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-6">
                {it.tipo === "etiqueta" ? (
                  <>
                    <div>
                      <label className="rotulo">Medida</label>
                      <select
                        className="campo"
                        value={it.outra ? "__outra" : it.tamanho ?? ""}
                        onChange={(e) =>
                          e.target.value === "__outra"
                            ? atualizar(i, { outra: true, medidaTxt: "" })
                            : atualizar(i, { outra: false, tamanho: e.target.value })
                        }
                      >
                        {tamanhos.map((t) => <option key={t} value={t}>{t} cm</option>)}
                        <option value="__outra">Outra medida…</option>
                      </select>
                      {it.outra && (
                        <input
                          className="campo mt-1.5"
                          autoFocus
                          value={it.medidaTxt ?? ""}
                          onChange={(e) => atualizar(i, { medidaTxt: e.target.value })}
                          placeholder="Ex: 5x3"
                        />
                      )}
                    </div>
                    <div>
                      <label className="rotulo">Quantidade</label>
                      <input className="campo" inputMode="numeric" value={it.qtdTxt ?? String(it.quantidade)} onChange={(e) => atualizar(i, { qtdTxt: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Descrição (opcional)</label>
                      <input className="campo" value={it.descricao ?? ""} onChange={(e) => atualizar(i, { descricao: e.target.value })} placeholder="Ex: colorida, fosco" />
                    </div>
                    <div>
                      <label className="rotulo">Seu preço total (R$)</label>
                      <input
                        className="campo"
                        inputMode="decimal"
                        value={it.manualTxt ?? ""}
                        onChange={(e) => atualizar(i, { manualTxt: e.target.value })}
                        placeholder={(it.sugerido ?? 0).toFixed(2).replace(".", ",")}
                      />
                      <div className="mt-1 text-[11px] text-mute">
                        {it.sugerido ? (
                          <>
                            Sugerido{it.outra ? " (estimado pela área)" : ""}: <Valor>{brl(it.sugerido)}</Valor>
                            {(it.manualTxt ?? "").trim() && (
                              <button type="button" onClick={() => atualizar(i, { manualTxt: "" })} className="ml-1 text-ciano underline">usar</button>
                            )}
                          </>
                        ) : it.outra ? "Digite a medida (ex: 5x3)" : "Sem preço na tabela"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="rotulo">Serviço</label>
                      <select className="campo" value={it.servico} onChange={(e) => atualizar(i, { servico: e.target.value })}>
                        {SERVICOS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Descrição</label>
                      <input className="campo" value={it.descricao ?? ""} onChange={(e) => atualizar(i, { descricao: e.target.value })} placeholder="O que é o item" />
                    </div>
                    <div>
                      <label className="rotulo">Quantidade</label>
                      <input className="campo" inputMode="numeric" value={it.quantidade} onChange={(e) => atualizar(i, { quantidade: Number(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <label className="rotulo">Valor unitário (R$)</label>
                      <input
                        className="campo"
                        inputMode="decimal"
                        value={it.valor_unitario || ""}
                        onChange={(e) => {
                          const v = Number(e.target.value.replace(",", ".")) || 0;
                          atualizar(i, { valor_unitario: v });
                        }}
                        placeholder="0,00"
                      />
                    </div>
                  </>
                )}
                <div className="flex items-end justify-between gap-2">
                  <span className="font-display font-semibold text-ciano">
                    <Valor>{brl(it.valor_total)}</Valor>
                    {it.tipo === "etiqueta" && it.quantidade > 0 && (
                      <span className="block text-[11px] font-normal text-mute"><Valor>{brl(it.valor_unitario)}</Valor>/un</span>
                    )}
                  </span>
                  <button type="button" onClick={() => remover(i)} className="rounded p-1.5 text-mute hover:bg-magenta/15 hover:text-magenta" aria-label="Remover item">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {itens.length > 0 && !editando && (
          <label className="flex items-center gap-2 border-t border-line p-3 text-sm">
            <input type="checkbox" checked={caixa} onChange={(e) => setCaixa(e.target.checked)} className="h-4 w-4 accent-ciano" />
            Enviar em caixa (+<Valor>{brl(CAIXA_ENVIO)}</Valor>, já somado no valor) — desmarcado = saquinho
          </label>
        )}
        {itens.length > 0 && (
          <div className="flex items-center justify-between border-t border-line p-3">
            <span className="text-sm text-mute">Total do orçamento</span>
            <span className="font-display text-lg font-bold text-ink"><Valor>{brl(total)}</Valor></span>
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-magenta">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className="botao disabled:opacity-60">
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar orçamento"}
        </button>
        {editando && <a href="/orcamentos" className="botao2">Cancelar</a>}
      </div>
    </form>
  );
}
