import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/supabase";
import { brl, dataBR } from "@/lib/format";
import { getEmpresa, coresPdf, pdfTxt, desenharLogo, telefoneBR, rodapeInfo } from "@/lib/empresa";

const PRETO_FAIXA = rgb(0.09, 0.09, 0.09);
const PRETO = rgb(0.11, 0.11, 0.11);
const AZUL_TEXTO = rgb(0.06, 0.2, 0.32); // título/valores — combina com a faixa ciano escura da referência
const CINZA = rgb(0.4, 0.42, 0.41);
const LINHA = rgb(0.87, 0.87, 0.87);
const BRANCO = rgb(1, 1, 1);

const mm = (v: number) => v * 2.834645669; // mm → pt

function quebraTexto(font: any, size: number, texto: string, larguraMax: number) {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = (atual + " " + p).trim();
    if (font.widthOfTextAtSize(teste, size) > larguraMax && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const emp = await getEmpresa();
  const { PRIM, SEC, MIX } = coresPdf(emp);
  const s = db();
  const { data: cfgP } = await s.from("config").select("adicional_prioridade").maybeSingle();
  const adicional = Number(cfgP?.adicional_prioridade ?? 0);
  const { data: orc, error } = await s.from("orcamentos").select("*").eq("id", id).single();
  if (error || !orc) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  const { data: itensRaw } = await s.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem");
  const itens = (itensRaw ?? []).map((i) => ({ ...i, valor_unitario: Number(i.valor_unitario), valor_total: Number(i.valor_total) }));

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Proposta Comercial - ${orc.cliente}`);
  const page = pdf.addPage([mm(210), mm(297)]);
  const W = mm(210), H = mm(297), M = mm(20);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  const drawText = (text: string, x: number, y: number, opts: { size?: number; font?: any; color?: any; align?: "left" | "right" } = {}) => {
    const { size = 10, font = reg, color = PRETO, align = "left" } = opts;
    const w = font.widthOfTextAtSize(text, size);
    const xx = align === "right" ? x - w : x;
    page.drawText(text, { x: xx, y, size, font, color });
  };

  // Fundo branco (página nasce branca por padrão no pdf-lib, mas deixamos explícito)
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BRANCO });

  // ---------- Faixa superior: preta + 3 cores CMYK coladas embaixo ----------
  const faixaPretaH = mm(9);
  const faixaCorH = mm(4);
  page.drawRectangle({ x: 0, y: H - faixaPretaH, width: W, height: faixaPretaH, color: PRETO_FAIXA });
  const terco = W / 3;
  page.drawRectangle({ x: 0, y: H - faixaPretaH - faixaCorH, width: terco, height: faixaCorH, color: PRIM });
  page.drawRectangle({ x: terco, y: H - faixaPretaH - faixaCorH, width: terco, height: faixaCorH, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: H - faixaPretaH - faixaCorH, width: W - 2 * terco, height: faixaCorH, color: MIX });

  const topoConteudo = H - faixaPretaH - faixaCorH;

  let y = topoConteudo - mm(18);
  drawText("PROPOSTA COMERCIAL", M, y, { size: 22, font: bold, color: PRETO });
  page.drawLine({ start: { x: M, y: y - mm(3) }, end: { x: M + mm(58), y: y - mm(3) }, thickness: 1.3, color: PRIM });
  drawText(dataExtenso(orc.data), M, y - mm(9), { size: 9, color: CINZA });

  y -= mm(24);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: LINHA });

  y -= mm(10);
  drawText("CLIENTE", M, y, { size: 8, color: CINZA });
  drawText(orc.cliente.toUpperCase(), M, y - mm(7), { size: 16, font: bold, color: PRETO });
  drawText("VALIDADE DA PROPOSTA", W - M, y, { size: 8, color: CINZA, align: "right" });
  drawText(`${orc.validade_dias} dias`, W - M, y - mm(6.5), { size: 11, font: bold, color: PRETO, align: "right" });

  y -= mm(17);
  drawText("Apresentamos abaixo os valores conforme solicitado.", M, y, { size: 9.5, color: CINZA });
  y -= mm(11);

  // ---------- Bloco "ETIQUETAS ADESIVAS" — faixa preta com barra magenta lateral ----------
  const temEtiqueta = itens.some((i) => i.tipo === "etiqueta");
  if (temEtiqueta) {
    const blocoH = mm(9);
    page.drawRectangle({ x: M, y: y - blocoH, width: W - 2 * M, height: blocoH, color: PRETO_FAIXA });
    page.drawRectangle({ x: M, y: y - blocoH, width: mm(1.6), height: blocoH, color: SEC });
    drawText("ETIQUETAS ADESIVAS", M + mm(6), y - mm(6.3), { size: 10.5, font: bold, color: BRANCO });
    y -= blocoH;
    y -= mm(6);
    drawText(
      "Produção sob medida conforme o pedido.",
      M, y, { size: 8, color: CINZA }
    );
    y -= mm(8);
  }

  // ---------- Tabela ITEM | TAMANHO | QTD | UNITÁRIO | VALOR ----------
  const colItem = M, colTam = M + mm(78), colQtd = M + mm(108), colUni = M + mm(138), colVal = W - M;
  drawText("ITEM", colItem, y, { size: 8, font: bold, color: CINZA });
  drawText("TAMANHO", colTam, y, { size: 8, font: bold, color: CINZA });
  drawText("QTD", colQtd, y, { size: 8, font: bold, color: CINZA });
  drawText("UNITÁRIO", colUni, y, { size: 8, font: bold, color: CINZA, align: "right" });
  drawText("VALOR", colVal, y, { size: 8, font: bold, color: CINZA, align: "right" });
  y -= mm(2.5);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: PRETO });

  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    y -= mm(9);
    const nomeItem = it.tipo === "etiqueta" ? (it.descricao ? `Adesivo ${it.descricao}` : "Adesivo") : (it.descricao ?? it.servico);
    drawText(nomeItem, colItem, y, { size: 9.5, font: bold, color: PRETO });
    drawText(it.tamanho ? (it.tipo === "etiqueta" ? `${it.tamanho} cm` : it.tamanho) : "—", colTam, y, { size: 9.5, color: CINZA });
    drawText(`${it.quantidade} un`, colQtd, y, { size: 9.5, color: CINZA });
    drawText(brl(it.valor_unitario), colUni, y, { size: 9.5, color: CINZA, align: "right" });
    drawText(brl(it.valor_total), colVal, y, { size: 10, font: bold, color: PRETO, align: "right" });
    y -= mm(3.5);
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: LINHA });
  }

  // ---------- Bloco VALOR TOTAL — faixa preta com barra magenta lateral ----------
  const totalGeral = itens.reduce((s2, i) => s2 + i.valor_total, 0);
  y -= mm(9);
  const totalBlocoH = mm(13);
  page.drawRectangle({ x: M, y: y - totalBlocoH, width: W - 2 * M, height: totalBlocoH, color: PRETO_FAIXA });
  page.drawRectangle({ x: M, y: y - totalBlocoH, width: mm(1.6), height: totalBlocoH, color: SEC });
  drawText("VALOR TOTAL", M + mm(6), y - mm(8.3), { size: 9.5, font: bold, color: BRANCO });
  drawText(brl(totalGeral), W - M - mm(6), y - mm(8.6), { size: 14, font: bold, color: rgb(1, 1, 1), align: "right" });
  y -= totalBlocoH;

  // ---------- Condições comerciais ----------
  y -= mm(15);
  drawText("CONDIÇÕES COMERCIAIS", M, y, { size: 10.5, font: bold, color: PRETO });
  page.drawLine({ start: { x: M, y: y - mm(3) }, end: { x: M + mm(42), y: y - mm(3) }, thickness: 1.3, color: SEC });
  y -= mm(10);

  const cond: [string, string][] = [
    ["Prazo de produção", orc.prazo ?? "5 dias úteis após aprovação da arte"],
    ["Forma de pagamento", orc.pagamento ?? "50% na aprovação e 50% na entrega | PIX"],
    ["Arte final", "Enviar em alta resolução nos formatos PDF, AI ou CDR."],
  ];
  if (orc.bonificacao) cond.push(["Bonificação", orc.bonificacao]);
  if (orc.producao_prioritaria) {
    cond.push(["Produção prioritária", adicional > 0 ? `Opcional: entrega em até 48h mediante acréscimo de ${brl(adicional)} ao valor.` : "Opcional: entrega em até 48h, consulte o acréscimo."]);
  }
  if (orc.observacoes) cond.push(["Observação", orc.observacoes]);

  for (const [titulo, texto] of cond) {
    drawText(titulo, M, y, { size: 8.5, font: bold, color: PRETO });
    const linhasTxt = quebraTexto(reg, 8.5, texto, W - M - (M + mm(38)));
    linhasTxt.forEach((lt, j) => drawText(lt, M + mm(38), y - j * mm(4.2), { size: 8.5, color: CINZA }));
    y -= linhasTxt.length * mm(4.2) + mm(4);
  }

  // ---------- Rodapé: espelha o cabeçalho — linha fina, texto, e faixa preta+CMYK ----------
  const faixaBaixoY = faixaPretaH + faixaCorH;
  const agradece = "Agradecemos a oportunidade.";
  const info = rodapeInfo(emp, (t) => reg.widthOfTextAtSize(t, 8), W - 2 * M - reg.widthOfTextAtSize(agradece, 8) - mm(8), W - 2 * M);
  const passo = mm(3.8);
  const yNome = faixaBaixoY + mm(3) + Math.max(1, info.length) * passo; // as linhas ficam acima da faixa colorida
  page.drawLine({ start: { x: M, y: yNome + mm(5) }, end: { x: W - M, y: yNome + mm(5) }, thickness: 0.7, color: LINHA });
  drawText(pdfTxt(emp.nome).toUpperCase(), M, yNome, { size: 9, font: bold, color: PRETO });
  drawText(telefoneBR(pdfTxt(emp.telefone)), W - M, yNome, { size: 9, font: bold, color: PRIM, align: "right" });
  info.forEach((t, i) => drawText(t, M, yNome - (i + 1) * passo, { size: 8, color: CINZA }));
  drawText(agradece, W - M, yNome - passo, { size: 8, color: CINZA, align: "right" });

  // faixa preta + 3 cores no rodapé (espelha o topo)
  page.drawRectangle({ x: 0, y: faixaPretaH, width: terco, height: faixaCorH, color: PRIM });
  page.drawRectangle({ x: terco, y: faixaPretaH, width: terco, height: faixaCorH, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: faixaPretaH, width: W - 2 * terco, height: faixaCorH, color: MIX });
  page.drawRectangle({ x: 0, y: 0, width: W, height: faixaPretaH, color: PRETO_FAIXA });

  // Logo da empresa (canto superior direito, abaixo das faixas)
  await desenharLogo(pdf, page, emp, { x: W - M - mm(50), y: topoConteudo - mm(5) - mm(22), w: mm(50), h: mm(22), direita: true });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Proposta_${orc.cliente.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}

function dataExtenso(iso: string) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${meses[m - 1]} de ${a}`;
}
