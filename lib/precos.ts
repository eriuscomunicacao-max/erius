export type PrecoTabela = { tamanho: string; quantidade: number; preco: number };

// Interpola o preço pela tabela (tamanho x quantidade), igual à calculadora de Config.
export function precoEtiqueta(precos: PrecoTabela[], tamanho: string, quantidade: number): number {
  const rows = precos.filter((p) => p.tamanho === tamanho).sort((a, b) => a.quantidade - b.quantidade);
  if (!rows.length || !quantidade) return 0;
  const exato = rows.find((r) => r.quantidade === quantidade);
  if (exato) return exato.preco;
  let a = rows[0], b = rows[rows.length - 1];
  if (quantidade < a.quantidade) b = rows[1] ?? a;
  else if (quantidade > b.quantidade) a = rows[rows.length - 2] ?? b;
  else for (let i = 0; i < rows.length - 1; i++) if (rows[i].quantidade < quantidade && rows[i + 1].quantidade > quantidade) { a = rows[i]; b = rows[i + 1]; }
  if (a.quantidade === b.quantidade) return a.preco;
  return a.preco + ((b.preco - a.preco) * (quantidade - a.quantidade)) / (b.quantidade - a.quantidade);
}

// Lê medidas tipo "5x3", "5 x 3", "5,5X3" → { a, b, texto: "5x3" }
export function lerMedida(t: string) {
  const m = String(t ?? "").match(/(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const a = Number(m[1].replace(",", ".")), b = Number(m[2].replace(",", "."));
  if (!a || !b) return null;
  const f = (v: number) => String(v).replace(".", ",");
  return { a, b, texto: `${f(a)}x${f(b)}` };
}

// Preço sugerido: medida da tabela → valor direto; medida fora da tabela → estima pela área (cm²)
export function precoSugerido(precos: PrecoTabela[], tamanho: string, quantidade: number): number {
  if (!quantidade) return 0;
  if (precos.some((p) => p.tamanho === tamanho)) return precoEtiqueta(precos, tamanho, quantidade);
  const med = lerMedida(tamanho);
  if (!med) return 0;
  const area = med.a * med.b;
  const padroes = [...new Set(precos.map((p) => p.tamanho))]
    .map((t) => ({ t, m: lerMedida(t) }))
    .filter((x) => x.m)
    .map((x) => ({ t: x.t, area: x.m!.a * x.m!.b }))
    .sort((x, y) => x.area - y.area);
  if (!padroes.length) return 0;
  if (padroes.length === 1) return (precoEtiqueta(precos, padroes[0].t, quantidade) * area) / padroes[0].area;
  let i = padroes.findIndex((p) => p.area >= area);
  if (i <= 0) i = 1;
  const a = padroes[i - 1], b = padroes[i];
  const pa = precoEtiqueta(precos, a.t, quantidade), pb = precoEtiqueta(precos, b.t, quantidade);
  const v = pa + ((pb - pa) * (area - a.area)) / (b.area - a.area);
  return Math.max(0, v);
}
