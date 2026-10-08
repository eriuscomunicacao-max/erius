import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { montarRelatorio } from "@/lib/relatorio";
import { brl, dataBR, mesAtual } from "@/lib/format";
import { getEmpresa, coresPdf, pdfTxt, desenharLogo } from "@/lib/empresa";

export const dynamic = "force-dynamic";

const FAIXA = rgb(0.09, 0.09, 0.09);
const PRETO = rgb(0.11, 0.11, 0.11);
const CINZA = rgb(0.4, 0.42, 0.41);
const LINHA = rgb(0.87, 0.87, 0.87);
const BRANCO = rgb(1, 1, 1);
const mm = (v: number) => v * 2.834645669;
const limpo = (t: string) => String(t ?? "").replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2022]/g, "").replace(/\u2212/g, "-");
const pctTxt = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(".", ",")}%`;

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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(q) ? q : mesAtual();
  const emp = await getEmpresa();
  const { PRIM, SEC, MIX } = coresPdf(emp);
  const r = await montarRelatorio(mes);
  const res = r.resultado;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Relatorio ${r.titulo}`);
  const W = mm(210), H = mm(297), M = mm(16);
  const page = pdf.addPage([W, H]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const txt = (t: string, x: number, y: number, o: { size?: number; font?: any; color?: any; right?: boolean } = {}) => {
    const { size = 9.5, font = reg, color = PRETO, right = false } = o;
    const tt = limpo(t.replace(/−/g, "-"));
    page.drawText(tt, { x: right ? x - font.widthOfTextAtSize(tt, size) : x, y, size, font, color });
  };

  // Faixas
  const fp = mm(8), fc = mm(3.5), terco = W / 3;
  page.drawRectangle({ x: 0, y: H - fp, width: W, height: fp, color: FAIXA });
  page.drawRectangle({ x: 0, y: H - fp - fc, width: terco, height: fc, color: PRIM });
  page.drawRectangle({ x: terco, y: H - fp - fc, width: terco, height: fc, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: H - fp - fc, width: W - 2 * terco, height: fc, color: MIX });
  const topo = H - fp - fc;

  let y = topo - mm(14);
  txt("RELATÓRIO MENSAL", M, y, { size: 20, font: bold });
  txt(`${r.titulo.toUpperCase()}  ·  ${r.fechado ? "MÊS FECHADO" : `PARCIAL ATÉ ${dataBR(r.ate)}`}`, M, y - mm(7), { size: 9.5, font: bold, color: SEC });
  await desenharLogo(pdf, page, emp, { x: W - M - mm(45), y: topo - mm(4) - mm(19), w: mm(45), h: mm(19), direita: true });
  y -= mm(16);

  const secao = (titulo: string) => {
    const h = mm(7);
    page.drawRectangle({ x: M, y: y - h, width: W - 2 * M, height: h, color: FAIXA });
    page.drawRectangle({ x: M, y: y - h, width: mm(1.4), height: h, color: SEC });
    txt(titulo, M + mm(5), y - mm(4.9), { size: 9.5, font: bold, color: BRANCO });
    y -= h + mm(6);
  };
  const colunas = (itens: { rot: string; val: string; sub?: string; cor?: any }[]) => {
    const w = (W - 2 * M) / itens.length;
    itens.forEach((it, i) => {
      const x = M + i * w;
      txt(it.rot.toUpperCase(), x, y, { size: 7, color: CINZA });
      txt(it.val, x, y - mm(5.5), { size: 12.5, font: bold, color: it.cor ?? PRETO });
      if (it.sub) txt(it.sub, x, y - mm(9.5), { size: 7.5, color: CINZA });
    });
    y -= mm(15);
  };

  // 1. Resultado
  secao("1. RESULTADO DO MÊS");
  colunas([
    { rot: "Vendido", val: brl(res.vendido), sub: `${res.varVendido} vs. ${r.anterior}` },
    { rot: "Recebido (após retiradas)", val: brl(res.recebidoLiq), sub: `${brl(res.recebido)} - ${brl(res.retirado)}`, cor: rgb(0, 0.45, 0.65) },
    { rot: "Lucro", val: brl(res.lucro), sub: `margem ${pctTxt(res.margem)}`, cor: res.lucro < 0 ? SEC : PRETO },
    { rot: "Em caixa agora", val: r.emCaixa !== null ? brl(r.emCaixa) : "-", sub: "soma dos envelopes" },
  ]);

  // 2. Envelopes
  secao("2. ENVELOPES");
  const cE = [M, M + mm(70), M + mm(110), W - M];
  txt("ENVELOPE", cE[0], y, { size: 7, font: bold, color: CINZA });
  txt("ENTROU NO MÊS", cE[1] + mm(25), y, { size: 7, font: bold, color: CINZA, right: true });
  txt("RETIRADO NO MÊS", cE[2] + mm(28), y, { size: 7, font: bold, color: CINZA, right: true });
  txt("SALDO", cE[3], y, { size: 7, font: bold, color: CINZA, right: true });
  y -= mm(2);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: PRETO });
  if (!r.envelopes.length) { y -= mm(5); txt("Meu Assessor não ativado.", M, y, { color: CINZA }); y -= mm(3); }
  r.envelopes.forEach((e) => {
    y -= mm(5.5);
    txt(e.nome + (e.aviso ? `  (${e.aviso})` : ""), cE[0], y, { size: 9 });
    txt(brl(e.entrou), cE[1] + mm(25), y, { size: 9, right: true });
    txt(e.retirado ? `-${brl(e.retirado)}` : brl(0), cE[2] + mm(28), y, { size: 9, right: true });
    txt(brl(e.saldo), cE[3], y, { size: 9, font: bold, right: true, color: e.saldo < 0 ? SEC : PRETO });
    y -= mm(2);
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.3, color: LINHA });
  });
  y -= mm(8);

  // 3. Tráfego e clientes
  secao("3. TRÁFEGO E CLIENTES");
  colunas([
    { rot: "Investido em anúncios", val: brl(r.trafego.investido), sub: r.trafego.retorno !== null ? `retorno ${r.trafego.retorno.toFixed(1).replace(".", ",")}x` : "sem gasto lançado" },
    { rot: "Clientes atendidos", val: String(r.clientes.atendidos), sub: `${r.clientes.novos} novos · ${r.clientes.pedidos} pedidos` },
    { rot: "Ticket médio", val: brl(r.clientes.ticket) },
    { rot: "A receber na entrega", val: brl(r.clientes.aReceberMes), sub: "pedidos deste mês" },
  ]);
  if (r.clientes.maior) { txt(`Maior cliente: ${r.clientes.maior.nome} · ${brl(r.clientes.maior.valor)} (${pctTxt(r.clientes.maior.pct)})`, M, y - mm(1), { size: 8.5, color: CINZA }); y -= mm(8); }

  // 4. Produção e orçamentos
  secao("4. PRODUÇÃO, ORÇAMENTOS E PRODUTOS");
  colunas([
    { rot: "OS abertas", val: String(r.producao.abertas) },
    { rot: "Entregues (prazo no mês)", val: `${r.producao.entregues}/${r.producao.prazoNoMes}` },
    { rot: "Atrasadas agora", val: String(r.producao.atrasadas), cor: r.producao.atrasadas ? SEC : PRETO },
    { rot: "Orçamentos aprovados", val: `${r.orcamentos.aprovados}/${r.orcamentos.enviados}`, sub: r.orcamentos.conversao !== null ? `${pctTxt(r.orcamentos.conversao, 0)} de conversão` : undefined },
  ]);
  txt(`Mais vendido: ${r.produtos.length ? r.produtos.map((p) => `${p.nome} ${brl(p.valor)} (${pctTxt(p.pct, 0)})`).join("  ·  ") : "sem vendas"}`, M, y - mm(1), { size: 8.5, color: CINZA });
  y -= mm(9);

  // 5. Plano
  secao("5. PLANO PRO PRÓXIMO MÊS");
  if (r.meta) {
    quebra(bold, 10, `Meta: ${limpo(r.meta)}`, W - 2 * M).forEach((l) => { txt(l, M, y, { size: 10, font: bold, color: rgb(0, 0.45, 0.65) }); y -= mm(5); });
    y -= mm(1);
  }
  r.recs.forEach((t) => {
    quebra(reg, 9, limpo(t), W - 2 * M - mm(5)).forEach((l, j) => { if (j === 0) txt("•", M, y, { size: 9, font: bold, color: SEC }); txt(l, M + mm(4), y, { size: 9 }); y -= mm(4.5); });
    y -= mm(1);
  });

  // Rodapé
  const fb = fp + fc;
  txt(`${pdfTxt(emp.nome).toUpperCase()} · relatório gerado pelo OrçaGrafica`, M, fb + mm(2), { size: 7.5, color: CINZA });
  page.drawRectangle({ x: 0, y: fp, width: terco, height: fc, color: PRIM });
  page.drawRectangle({ x: terco, y: fp, width: terco, height: fc, color: SEC });
  page.drawRectangle({ x: 2 * terco, y: fp, width: W - 2 * terco, height: fc, color: MIX });
  page.drawRectangle({ x: 0, y: 0, width: W, height: fp, color: FAIXA });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Relatorio_${mes}.pdf"` },
  });
}
