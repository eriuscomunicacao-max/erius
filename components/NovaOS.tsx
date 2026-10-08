"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarOS, atualizarOS } from "@/app/actions";
import { SERVICOS, FORMAS } from "@/lib/constants";
import type { Produto } from "@/lib/produtos";
import { Valor } from "@/components/Privacidade";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const parse = (s: string) => {
  let t = String(s ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const x = Number(t);
  return isFinite(x) ? x : 0;
};
const paraCampo = (v: number) => v.toFixed(2).replace(".", ",");

type Item = { servico: string; descricao: string; quantidade: string; unitario: string; fixo?: number };
const itemVazio = (): Item => ({ servico: SERVICOS[0], descricao: "", quantidade: "1", unitario: "" });
const qtdDe = (it: Item) => Math.max(1, Math.round(parse(it.quantidade)) || 1);
// "fixo" guarda o total original (ex: vindo do orçamento) até você mexer na qtd ou no valor
const subtotal = (it: Item) => it.fixo ?? Math.round(qtdDe(it) * parse(it.unitario) * 100) / 100;

type InicialOS = {
  id: string; cliente: string; telefone: string | null; data: string; prazo_entrega: string | null;
  forma_pagto: string | null; observacoes: string | null;
  itens: { servico: string; descricao: string; quantidade: number; valor_unitario: number; valor_total: number }[];
};

export default function NovaOS({ hoje, nomes, inicial, pagoAtual = 0, produtos = [] }: { hoje: string; nomes: string[]; inicial?: InicialOS; pagoAtual?: number; produtos?: Produto[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const editando = !!inicial;
  const [itens, setItens] = useState<Item[]>(() =>
    inicial?.itens.length
      ? inicial.itens.map((i) => ({
          servico: i.servico, descricao: i.descricao, quantidade: String(i.quantidade),
          unitario: (i.valor_total / (i.quantidade || 1)).toFixed(2).replace(".", ","),
          fixo: i.valor_total,
        }))
      : [itemVazio()]
  );
  const [pagou50, setPagou50] = useState<"sim" | "nao">("nao");
  const [pagoTxt, setPagoTxt] = useState("");
  const [editado, setEditado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const total = itens.reduce((s, i) => s + subtotal(i), 0);
  const metade = Math.round(total * 50) / 100;
  const pago = editando ? pagoAtual : pagou50 === "sim" ? (editado ? parse(pagoTxt) : metade) : 0;
  const falta = total - pago;

  function mudar(i: number, patch: Partial<Item>) {
    setItens((v) =>
      v.map((it, idx) => {
        if (idx !== i) return it;
        const novo = { ...it, ...patch };
        if ("quantidade" in patch || "unitario" in patch) delete novo.fixo;
        return novo;
      })
    );
  }

  async function salvar() {
    const fd = new FormData(formRef.current!);
    if (!String(fd.get("cliente") ?? "").trim()) return setErro("Informe o cliente.");
    const validos = itens.filter((i) => i.descricao.trim());
    if (!validos.length) return setErro("Descreva ao menos um serviço.");
    if (!fd.get("prazo_entrega")) return setErro("Informe o prazo de entrega.");
    if (editando) {
      setErro("");
      setSalvando(true);
      fd.set("id", String(inicial!.id));
      fd.set("itens", JSON.stringify(validos.map((i) => ({ servico: i.servico, descricao: i.descricao.trim(), quantidade: qtdDe(i), valor_unitario: parse(i.unitario), valor_total: subtotal(i) }))));
      try {
        await atualizarOS(fd);
        router.push("/os");
      } catch (e: any) {
        setErro(e?.message ?? "Erro ao salvar.");
        setSalvando(false);
      }
      return;
    }
    setErro("");
    setSalvando(true);
    fd.set(
      "itens",
      JSON.stringify(validos.map((i) => ({ servico: i.servico, descricao: i.descricao.trim(), quantidade: qtdDe(i), valor_unitario: parse(i.unitario), valor_total: subtotal(i) })))
    );
    fd.set("valor_pago", String(pago));
    try {
      await criarOS(fd);
      formRef.current?.reset();
      setItens([itemVazio()]);
      setPagou50("nao");
      setPagoTxt("");
      setEditado(false);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
      {/* Cliente e prazo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-2">
          <label className="rotulo" htmlFor="os-cliente">Cliente</label>
          <input id="os-cliente" name="cliente" list="os-lista-clientes" required defaultValue={inicial?.cliente ?? ""} className="campo" placeholder="Nome do cliente" />
          <datalist id="os-lista-clientes">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div>
          <label className="rotulo" htmlFor="os-telefone">WhatsApp</label>
          <input id="os-telefone" name="telefone" inputMode="tel" defaultValue={inicial?.telefone ?? ""} className="campo" placeholder="(19) 99999-9999" />
        </div>
        <div>
          <label className="rotulo" htmlFor="os-data">Data da OS</label>
          <input id="os-data" name="data" type="date" defaultValue={inicial?.data ?? hoje} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="os-prazo">Prazo de entrega</label>
          <input id="os-prazo" name="prazo_entrega" type="date" required min={editando ? undefined : hoje} defaultValue={inicial?.prazo_entrega ?? ""} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="os-forma">Pagamento</label>
          <select id="os-forma" name="forma_pagto" defaultValue={inicial?.forma_pagto ?? FORMAS[0]} className="campo">{FORMAS.map((f) => <option key={f}>{f}</option>)}</select>
        </div>
      </div>

      {/* Serviços */}
      <div className="rounded-lg border border-line">
        <div className="flex items-center justify-between border-b border-line p-3">
          <span className="text-sm font-semibold text-ink">Discriminação dos serviços</span>
          <button type="button" onClick={() => setItens((v) => [...v, itemVazio()])} className="botao2 py-1 text-xs">+ Serviço</button>
        </div>
        <ul className="divide-y divide-line">
          {itens.map((it, i) => (
            <li key={i} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-12">
              {produtos.length > 0 && !inicial && (
                <div className="col-span-2 md:col-span-12">
                  <label className="rotulo">Preencher com produto cadastrado (opcional)</label>
                  <select
                    className="campo"
                    value=""
                    onChange={(e) => {
                      const p = produtos.find((x) => x.id === e.target.value);
                      if (!p) return;
                      const unit = p.unidade === "milheiro" ? p.preco / 1000 : p.preco;
                      mudar(i, { servico: p.categoria, descricao: p.nome, unitario: paraCampo(unit), quantidade: p.unidade === "milheiro" ? "1000" : "1" });
                    }}
                  >
                    <option value="">— escolher —</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="rotulo">Tipo</label>
                <select className="campo" value={it.servico} onChange={(e) => mudar(i, { servico: e.target.value })}>
                  {SERVICOS.map((s) => <option key={s}>{s}</option>)}
                  {!SERVICOS.includes(it.servico as any) && <option>{it.servico}</option>}
                </select>
              </div>
              <div className="col-span-2 md:col-span-5">
                <label className="rotulo">Descrição do serviço</label>
                <input className="campo" value={it.descricao} onChange={(e) => mudar(i, { descricao: e.target.value })} placeholder="O que será produzido" />
              </div>
              <div className="md:col-span-1">
                <label className="rotulo">Qtd</label>
                <input className="campo" inputMode="numeric" value={it.quantidade} onChange={(e) => mudar(i, { quantidade: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="rotulo">Valor unit. (R$)</label>
                <input className="campo" inputMode="decimal" value={it.unitario} onChange={(e) => mudar(i, { unitario: e.target.value })} placeholder="0,00" />
              </div>
              <div className="col-span-2 flex items-end justify-between gap-2 md:col-span-2">
                <span className="pb-2 font-display font-semibold text-ciano"><Valor>{brl(subtotal(it))}</Valor></span>
                {itens.length > 1 && (
                  <button type="button" onClick={() => setItens((v) => v.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-mute hover:bg-magenta/15 hover:text-magenta" aria-label="Remover serviço">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line p-3">
          <span className="text-sm text-mute">Valor total da OS</span>
          <span className="font-display text-xl font-bold text-ink"><Valor>{brl(total)}</Valor></span>
        </div>
      </div>

      {editando ? (
        <div className="flex flex-wrap justify-end gap-6 rounded-lg border border-line p-4 text-right">
          <div><div className="rotulo">Pago até agora</div><div className="font-display text-lg font-semibold text-ciano"><Valor>{brl(pago)}</Valor></div></div>
          <div>
            <div className="rotulo">Falta pagar</div>
            <div className={`font-display text-lg font-bold ${falta > 0.005 ? "text-magenta" : "text-ciano"}`}><Valor>{falta > 0.005 ? brl(falta) : "Quitado"}</Valor></div>
          </div>
          <p className="basis-full text-xs text-mute">Os pagamentos não mudam aqui. Pra registrar mais, use "Receber" na lista.</p>
        </div>
      ) : (
      <>
      {/* Pagamento */}
      <div className="grid gap-4 rounded-lg border border-line p-4 md:grid-cols-[auto_1fr_auto]">
        <div>
          <span className="rotulo">Cliente pagou 50% do valor total?</span>
          <div className="flex gap-2">
            {(["sim", "nao"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => { setPagou50(op); setEditado(false); setPagoTxt(""); }}
                className={`rounded-lg border px-5 py-2 text-sm font-semibold ${
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

        <div>
          {pagou50 === "sim" ? (
            <>
              <label className="rotulo" htmlFor="os-pago">Valor pago (R$) — altere se pagou a mais ou a menos</label>
              <div className="flex gap-2">
                <input
                  id="os-pago"
                  inputMode="decimal"
                  className="campo max-w-[180px]"
                  value={editado ? pagoTxt : paraCampo(metade)}
                  onChange={(e) => { setEditado(true); setPagoTxt(e.target.value); }}
                />
                {editado && (
                  <button type="button" onClick={() => { setEditado(false); setPagoTxt(""); }} className="botao2 text-xs">Voltar p/ 50%</button>
                )}
              </div>
            </>
          ) : (
            <p className="pt-6 text-sm text-mute">Sem entrada. O valor total fica em aberto.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-right md:min-w-[260px]">
          <div>
            <div className="rotulo">Pago</div>
            <div className="font-display text-lg font-semibold text-ciano"><Valor>{brl(pago)}</Valor></div>
          </div>
          <div>
            <div className="rotulo">Falta pagar</div>
            <div className={`font-display text-lg font-bold ${falta > 0.005 ? "text-magenta" : "text-ciano"}`}>
              <Valor>{falta > 0.005 ? brl(falta) : "Quitado"}</Valor>
            </div>
          </div>
          {falta < -0.005 && (
            <p className="col-span-2 text-xs text-amarelo">Pagou <Valor>{brl(-falta)}</Valor> a mais que o total.</p>
          )}
        </div>
      </div>

      </>
      )}

      <div>
        <label className="rotulo" htmlFor="os-obs">Observações (opcional)</label>
        <input id="os-obs" name="observacoes" defaultValue={inicial?.observacoes ?? ""} className="campo" placeholder="Ex: arte enviada pelo WhatsApp, retirar na loja" />
      </div>

      {erro && <p className="text-sm text-magenta">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className="botao disabled:opacity-60">
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Abrir OS"}
        </button>
        {editando && <a href="/os" className="botao2">Cancelar</a>}
      </div>
    </form>
  );
}
