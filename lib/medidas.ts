// Lista de medidas → metragem total (funções puras, usadas no editor e no PDF).

export type Medida = { larg: number; alt: number; qtd: number; area: number };

const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const num = (s: string) => {
  let t = s.trim();
  if (!t) return NaN;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return Number(t);
};

// 0,45x0,80 | 0,45 x 0,80 x2 | 0,45 x 0,80 2 | 45x80cm | 0,5x0,6m x 3un
const LINHA = /^([\d.,]+)\s*(?:m|cm)?\s*x\s*([\d.,]+)\s*(cm|m)?\s*(?:(?:x|\*)?\s*(\d+)\s*(?:un\w*|pcs|pe[cç]as?)?)?$/;

/** Lê o texto (uma medida por linha, em metros; "cm" no fim converte) e soma a metragem. */
export function parseMedidas(texto: string) {
  const itens: Medida[] = [];
  const invalidas: string[] = [];
  const linhas = String(texto ?? "").replace(/×/g, "x").split(/\r?\n|;/);
  for (const bruta of linhas) {
    const l = bruta.trim().toLowerCase();
    if (!l) continue;
    const m = l.match(LINHA);
    if (!m) { invalidas.push(bruta.trim()); continue; }
    const cm = m[3] === "cm" || /cm\b/.test(l);
    let larg = num(m[1]);
    let alt = num(m[2]);
    const qtd = m[4] ? parseInt(m[4], 10) : 1;
    if (!isFinite(larg) || !isFinite(alt) || larg <= 0 || alt <= 0 || qtd <= 0) { invalidas.push(bruta.trim()); continue; }
    if (cm) { larg /= 100; alt /= 100; }
    itens.push({ larg, alt, qtd, area: r4(larg * alt * qtd) });
  }
  const areaTotal = r4(itens.reduce((s, i) => s + i.area, 0));
  const pecas = itens.reduce((s, i) => s + i.qtd, 0);
  return { itens, invalidas, areaTotal, pecas, linhas: itens.length };
}

/** 3,0624 → "3,06" */
export const fmtM2 = (v: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(r2(v));
