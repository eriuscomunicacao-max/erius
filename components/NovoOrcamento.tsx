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

// Formas de pagamento (vira o texto "Forma de pagamento" do PDF)
const PAG_5050 = "50% na aprovação e 50% na entrega | PIX";
const PAG_PIX = "PIX integral na aprovação";
const PAG_BOLETO = "Boleto bancário";
const CARTAO_RE = /^Cartão de crédito em até (\d{1,2})x$/;
type PagTipo = "5050" | "pix" | "cartao" | "boleto" | "outro";
function lerPagamento(t: string): { tipo: PagTipo; parcelas: string; outro: string } {
  const v = t.trim();
  if (!v || v === PAG_5050) return { tipo: "5050", parcelas: "3", outro: "" };
  if (v === PAG_PIX) return { tipo: "pix", parcelas: "3", outro: "" };
  if (v === PAG_BOLETO) return { tipo: "boleto", parcelas: "3", outro: "" };
  const m = v.match(CARTAO_RE);
  if (m) return { tipo: "cartao", parcelas: m[1], outro: "" };
  return { tipo: "outro", parcelas: "3", outro: v };
}
type Inicial = {
  id: string; cliente: string; data: string; validade_dias: number; prazo: string | null; pagamento: string | null;
  observacoes: string | null; bonificacao: string | null; producao_prioritaria: boolean;
  urgencia_tipo?: "valor" | "percentual"; urgencia_valor?: number | null; mostrar_prazo?: boolean; mostrar_arte?: boolean;
  envio?: boolean; valor_envio?: number | null;
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
  // forma de pagamento (seleção)
  const pagIni = lerPagamento(inicial ? inicial.pagamento ?? "" : padroes.pagamento);
  const [pagTipo, setPagTipo] = useState<PagTipo>(pagIni.tipo);
  const [parcelas, setParcelas] = useState(pagIni.parcelas);
  const [pagOutro, setPagOutro] = useState(pagIni.outro);
  const pagamentoFinal =
    pagTipo === "5050" ? PAG_5050
    : pagTipo === "pix" ? PAG_PIX
    : pagTipo === "boleto" ? PAG_BOLETO
    : pagTipo === "cartao" ? `Cartão de crédito em até ${parcelas}x`
    : pagOutro.trim();

  // taxa de urgência (produção prioritária): em % sobre o total ou em R$
  const urgTipoIni: "valor" | "percentual" = inicial?.urgencia_tipo ?? (padroes.adicional > 0 ? "valor" : "percentual");
  const urgValorIni = inicial?.urgencia_valor != null ? txtBR(Number(inicial.urgencia_valor)) : urgTipoIni === "valor" && padroes.adicional > 0 ? txtBR(padroes.adicional) : "";
  const [prio, setPrio] = useState(inicial?.producao_prioritaria ?? false);
  const [urgTipo, setUrgTipo] = useState<"valor" | "percentual">(urgTipoIni);
  const [urgValorTxt, setUrgValorTxt] = useState(urgValorIni);

  // o que aparece nas condições comerciais do PDF
  const [mostrarPrazo, setMostrarPrazo] = useState(inicial?.mostrar_prazo ?? true);
  const [mostrarArte, setMostrarArte] = useState(inicial?.mostrar_arte ?? true);

  // envio pelos Correios: o valor soma no total do cliente, mas não aparece no PDF nem no faturamento
  const [envio, setEnvio] = useState<"sim" | "nao">(inicial?.envio ? "sim" : "nao");
  const [envioTxt, setEnvioTxt] = useState(inicial?.envio && inicial.valor_envio ? txtBR(Number(inicial.valor_envio)) : "");

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
  const valorEnvio = envio === "sim" ? Math.max(0, parseBR(envioTxt)) : 0;
  const totalGeral = r2(total + valorEnvio);

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
    if (envio === "sim" && !(parseBR(envioTxt) > 0)) return setErro("Informe o valor do envio ou marque \"Não\".");
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
      const p0 = lerPagamento(padroes.pagamento);
      setPagTipo(p0.tipo); setParcelas(p0.parcelas); setPagOutro(p0.outro);
      setPrio(false); setUrgTipo(urgTipoIni); setUrgValorTxt(urgValorIni);
      setMostrarPrazo(true); setMostrarArte(true);
      setEnvio("nao"); setEnvioTxt("");
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
          <div className="flex items-center justify-between gap-2">
            <label className="rotulo" htmlFor="prazo">Prazo de produção</label>
            <label className="flex items-center gap-1 text-[11px] text-mute">
              <input type="checkbox" name="mostrar_prazo" checked={mostrarPrazo} onChange={(e) => setMostrarPrazo(e.target.checked)} className="h-3.5 w-3.5 accent-ciano" />
              mostrar no PDF
            </label>
          </div>
          <input id="prazo" name="prazo" defaultValue={inicial ? inicial.prazo ?? "" : padroes.prazo} className={`campo ${mostrarPrazo ? "" : "opacity-50"}`} />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="pagTipo">Forma de pagamento</label>
          <div className="flex gap-2">
            <select id="pagTipo" className="campo" value={pagTipo} onChange={(e) => setPagTipo(e.target.value as PagTipo)}>
              <option value="5050">PIX 50% na aprovação e 50% na entrega</option>
              <option value="pix">PIX integral</option>
              <option value="cartao">Cartão de crédito (parcelado)</option>
              <option value="boleto">Boleto</option>
              <option value="outro">Outro (digitar)</option>
            </select>
            {pagTipo === "cartao" && (
              <select className="campo w-28 shrink-0" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Parcelas">
                {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => <option key={n} value={String(n)}>{n}x</option>)}
              </select>
            )}
          </div>
          {pagTipo === "outro" && (
            <input className="campo mt-2" value={pagOutro} onChange={(e) => setPagOutro(e.target.value)} placeholder="Ex: 30% na aprovação e 70% na entrega" />
          )}
          <input type="hidden" name="pagamento" value={pagamentoFinal} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <div className="rotulo">É para envio (Correios)?</div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="envio" value="nao" checked={envio === "nao"} onChange={() => setEnvio("nao")} className="h-4 w-4 accent-ciano" />
              <span>Não</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="envio" value="sim" checked={envio === "sim"} onChange={() => setEnvio("sim")} className="h-4 w-4 accent-ciano" />
              <span>Sim</span>
            </label>
          </div>
          {envio === "sim" && (
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div>
                <label className="rotulo" htmlFor="valor_envio">Valor do envio (R$)</label>
                <input id="valor_envio" name="valor_envio" className="campo" inputMode="decimal" value={envioTxt} onChange={(e) => setEnvioTxt(e.target.value)} placeholder="0,00" />
              </div>
              <p className="col-span-2 flex items-end pb-2 text-xs text-mute">Soma no total que o cliente paga. Não aparece como linha no PDF e não entra no faturamento.</p>
            </div>
          )}
        </div>
        <div className="col-span-2 md:col-span-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="producao_prioritaria" checked={prio} onChange={(e) => setPrio(e.target.checked)} className="h-4 w-4 accent-ciano" />
              <span>Oferecer produção prioritária (taxa de urgência)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="mostrar_arte" checked={mostrarArte} onChange={(e) => setMostrarArte(e.target.checked)} className="h-4 w-4 accent-ciano" />
              <span>Mostrar &quot;Arte final&quot; (enviar arquivo) no PDF</span>
            </label>
          </div>
          {prio && (
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div>
                <label className="rotulo" htmlFor="urgencia_tipo">Cobrar em</label>
                <select
                  id="urgencia_tipo" name="urgencia_tipo" className="campo" value={urgTipo}
                  onChange={(e) => {
                    const t = e.target.value as "valor" | "percentual";
                    setUrgTipo(t);
                    setUrgValorTxt(t === "valor" && padroes.adicional > 0 ? txtBR(padroes.adicional) : "");
                  }}
                >
                  <option value="percentual">Porcentagem (%) sobre o total</option>
                  <option value="valor">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="rotulo" htmlFor="urgencia_valor">{urgTipo === "percentual" ? "Porcentagem (%)" :
