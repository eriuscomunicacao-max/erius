import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/supabase";
import { brl, dataBR } from "@/lib/format";
import { getEmpresa, coresPdf, pdfTxt, desenharLogo } from "@/lib/empresa";

const PRETO_FAIXA = rgb(0.09, 0.09, 0.09);
const PRETO = rgb(0.11, 0.11, 0.11);
const CINZA = rgb(0.4, 0.42, 0.41);
const LINHA = rgb(0.87, 0.87, 0.87);
const BRANCO = rgb(1, 1, 1);
const mm = (v: number) => v * 2.834645669;

// Fontes padrão do PDF só aceitam Latin-1: remove emoji e afins pra não quebrar
const limpo = (t: string) => String(t ?? "").replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2022]/g, "");
const STATUS: Record<string, string> = { aberta: "Aberta", producao: "Em produção", pronta: "Pronta", entregue: "Entregue" };

function quebra(font: any, size: number, texto: string, max: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(" ")) {
    const t = (atual + " " + p).trim();
    if (font.widthOfTextAtSize(t, size) > max && atual) { linhas.push(atual); atual = p; } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const emp = await getEmpresa();
  const { PRIM, SEC, MIX } = coresPdf(emp);
  const s = db();
  const { data: os } = await s.from("ordens_servico").select("*").eq("id", id).single();
  if (!os) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  const { data: itensRaw } = await s.from("os_itens").select("*").eq("os_id", id).order("ordem");
  const itens = (itensRaw ?? []).map((i) => ({ ...i, valor_unitario: Number(i.valor_unitario), valor_total: Number(i.valor_total) }));
  let pago = 0;
  if (os.pedido_id) {
    const { data: pgs } = await s.from("pagamentos").select("valor").eq("pedido_id", os.pedido_id);
    pago = (pgs ?? []).reduce((t, p) => t + Number(p.valor), 0);
  }
  const total = itens.reduce((t, i) => t + i.valor_total, 0);
  const falta = Math.max(0, total - pago);
  const numero = String(os.numero).padStart(4, "0");

  const pdf = await PDFDocument.create();
  pdf.setTitle(`OS ${numero} - ${limpo(os.cliente)}`);
  const W = mm(210), H = mm(297), M = mm(18);
  const page = pdf.addPage([W, H]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const txt = (t: string, x: number, y: number, o: { size?: number; font?: any; color?: any; right?: boolean } = {}) => {
    const { size = 10, font = reg, color = PRETO, right = false } = o;
    const tt = limpo(t);
    page.drawText(tt, { x: right ? x - font.widthOfTextAtSize(tt, size) : x, y, size, font, color });
  };

  // Faixas topo
  const fp = mm(9), fc = mm(4), terco = W / 3;
  page.drawRectangle({ x: 0, y: H - fp, width: W, height: fp, color: PRETO_FAIXA });
  page.drawRectangle({ x: 0, y: H - fp - fc, width: terco, height: fc, color: PRIM });
  page.drawRectangle({ x: terco, y: H - fp - fc, width: terco, height: fc, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: H - fp - fc, width: W - 2 * terco, height: fc, color: MIX });
  const topo = H - fp - fc;

  let y = topo - mm(16);
  txt("ORDEM DE SERVIÇO", M, y, { size: 22, font: bold });
  page.drawLine({ start: { x: M, y: y - mm(3) }, end: { x: M + mm(62), y: y - mm(3) }, thickness: 1.3, color: PRIM });
  txt(`Nº ${numero}  ·  Status: ${STATUS[os.status] ?? os.status}`, M, y - mm(9), { size: 10, font: bold, color: SEC });

  await desenharLogo(pdf, page, emp, { x: W - M - mm(50), y: topo - mm(5) - mm(22), w: mm(50), h: mm(22), direita: true });

  y -= mm(22);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: LINHA });

  // Dados
  y -= mm(9);
  txt("CLIENTE", M, y, { size: 8, color: CINZA });
  txt("ABERTURA", M + mm(105), y, { size: 8, color: CINZA });
  txt("PRAZO DE ENTREGA", W - M, y, { size: 8, color: CINZA, right: true });
  txt(String(os.cliente).toUpperCase(), M, y - mm(6.5), { size: 14, font: bold });
  txt(dataBR(os.data), M + mm(105), y - mm(6.5), { size: 11, font: bold });
  txt(os.prazo_entrega ? dataBR(os.prazo_entrega) : "—", W - M, y - mm(6.5), { size: 13, font: bold, color: SEC, right: true });
  if (os.telefone) txt(`WhatsApp: ${os.telefone}`, M, y - mm(12), { size: 9, color: CINZA });
  y -= mm(20);

  // Faixa título
  const bh = mm(9);
  page.drawRectangle({ x: M, y: y - bh, width: W - 2 * M, height: bh, color: PRETO_FAIXA });
  page.drawRectangle({ x: M, y: y - bh, width: mm(1.6), height: bh, color: SEC });
  txt("DISCRIMINAÇÃO DOS SERVIÇOS", M + mm(6), y - mm(6.3), { size: 10.5, font: bold, color: BRANCO });
  y -= bh + mm(7);

  const cQtd = M + mm(112), cUni = M + mm(145), cVal = W - M;
  txt("DESCRIÇÃO", M, y, { size: 8, font: bold, color: CINZA });
  txt("QTD", cQtd, y, { size: 8, font: bold, color: CINZA });
  txt("UNITÁRIO", cUni, y, { size: 8, font: bold, color: CINZA, right: true });
  txt("VALOR", cVal, y, { size: 8, font: bold, color: CINZA, right: true });
  y -= mm(2.5);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: PRETO });

  for (const it of itens) {
    const linhas = quebra(reg, 9.5, limpo(it.descricao), mm(105));
    y -= mm(7);
    linhas.forEach((l, j) => txt(l, M, y - j * mm(4.3), { size: 9.5, font: j === 0 ? bold : reg }));
    txt(`${it.quantidade}`, cQtd, y, { size: 9.5, color: CINZA });
    txt(brl(it.valor_unitario), cUni, y, { size: 9.5, color: CINZA, right: true });
    txt(brl(it.valor_total), cVal, y, { size: 10, font: bold, right: true });
    y -= (linhas.length - 1) * mm(4.3) + mm(3.5);
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: LINHA });
    if (y < mm(110)) break; // segura o layout em 1 página
  }

  // Totais
  y -= mm(8);
  const th = mm(26);
  page.drawRectangle({ x: M, y: y - th, width: W - 2 * M, height: th, color: PRETO_FAIXA });
  page.drawRectangle({ x: M, y: y - th, width: mm(1.6), height: th, color: SEC });
  const col = (rot: string, val: string, x: number, cor: any) => {
    txt(rot, x, y - mm(9), { size: 8.5, color: rgb(0.75, 0.75, 0.75), right: true });
    txt(val, x, y - mm(18), { size: 14, font: bold, color: cor, right: true });
  };
  col("VALOR TOTAL", brl(total), M + mm(62), BRANCO);
  col("PAGO", brl(pago), M + mm(118), PRIM);
  col("FALTA PAGAR", falta > 0.005 ? brl(falta) : "QUITADO", W - M - mm(6), falta > 0.005 ? rgb(1, 0.35, 0.7) : PRIM);
  y -= th + mm(10);

  txt("Forma de pagamento:", M, y, { size: 9, font: bold });
  txt(os.forma_pagto ?? "Pix", M + mm(36), y, { size: 9, color: CINZA });
  if (os.observacoes) {
    y -= mm(6);
    txt("Observações:", M, y, { size: 9, font: bold });
    quebra(reg, 9, limpo(os.observacoes), W - 2 * M - mm(36)).slice(0, 4).forEach((l, j) => txt(l, M + mm(36), y - j * mm(4.3), { size: 9, color: CINZA }));
  }

  // Assinaturas
  const ya = mm(48);
  page.drawLine({ start: { x: M, y: ya }, end: { x: M + mm(75), y: ya }, thickness: 0.6, color: PRETO });
  page.drawLine({ start: { x: W - M - mm(75), y: ya }, end: { x: W - M, y: ya }, thickness: 0.6, color: PRETO });
  txt("Assinatura do cliente", M, ya - mm(4.5), { size: 8, color: CINZA });
  txt("Recebido em ____/____/________", W - M - mm(75), ya - mm(4.5), { size: 8, color: CINZA });

  // Rodapé
  const fb = fp + fc;
  page.drawLine({ start: { x: M, y: fb + mm(6) }, end: { x: W - M, y: fb + mm(6) }, thickness: 0.7, color: LINHA });
  txt(pdfTxt(emp.nome).toUpperCase(), M, fb + mm(0.5), { size: 9, font: bold });
  txt(emp.cnpj ? `CNPJ ${pdfTxt(emp.cnpj)}` : pdfTxt(emp.endereco), M, fb - mm(3.5), { size: 8, color: CINZA });
  txt(pdfTxt(emp.telefone), W - M, fb + mm(0.5), { size: 9, font: bold, color: PRIM, right: true });
  page.drawRectangle({ x: 0, y: fp, width: terco, height: fc, color: PRIM });
  page.drawRectangle({ x: terco, y: fp, width: terco, height: fc, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: fp, width: W - 2 * terco, height: fc, color: MIX });
  page.drawRectangle({ x: 0, y: 0, width: W, height: fp, color: PRETO_FAIXA });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="OS_${numero}_${limpo(os.cliente).replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
