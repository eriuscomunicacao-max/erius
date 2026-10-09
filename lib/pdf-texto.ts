// Textos e formatação dos PDFs (funções puras, sem banco/rede).

/** Remove caracteres que a fonte padrão do PDF não suporta (emoji etc.). */
export const pdfTxt = (v: string | null | undefined) => (v ?? "").replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "").trim();

/** (19) 99001-3719 — formata o telefone mesmo se foi digitado só com números. */
export function telefoneBR(v: string | null | undefined) {
  const raw = (v ?? "").trim();
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

/** CNPJ ou CPF com pontuação; se não tiver 11 ou 14 dígitos, devolve como foi digitado. */
export function documentoBR(v: string | null | undefined) {
  const raw = (v ?? "").trim();
  const d = raw.replace(/\D/g, "");
  if (d.length === 14) return { rotulo: "CNPJ", valor: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` };
  if (d.length === 11) return { rotulo: "CPF", valor: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` };
  return { rotulo: "CNPJ", valor: raw };
}

/**
 * Linhas de informação do rodapé dos PDFs (CNPJ · e-mail · endereço), só com o que a empresa preencheu.
 * Quebra em novas linhas conforme a largura e limita a 3 linhas para não invadir o conteúdo.
 */
export function rodapeInfo(
  e: { cnpj: string | null; email: string | null; endereco: string | null }, medir: (t: string) => number, larguraPrimeira: number, larguraTotal: number,
): string[] {
  const doc = documentoBR(e.cnpj);
  const partes = [e.cnpj ? `${doc.rotulo} ${pdfTxt(doc.valor)}` : "", pdfTxt(e.email), pdfTxt(e.endereco)].filter(Boolean);
  const cortar = (t: string, max: number) => {
    if (medir(t) <= max) return t;
    let c = t;
    while (c.length > 1 && medir(c + "…") > max) c = c.slice(0, -1);
    return c.trimEnd() + "…";
  };
  const linhas: string[] = [];
  let atual = "";
  for (const p of partes) {
    const max = linhas.length === 0 ? larguraPrimeira : larguraTotal;
    const tentativa = atual ? `${atual}   ·   ${p}` : p;
    if (!atual || medir(tentativa) <= max) atual = tentativa;
    else {
      linhas.push(cortar(atual, max));
      atual = p;
    }
  }
  if (atual) linhas.push(cortar(atual, linhas.length === 0 ? larguraPrimeira : larguraTotal));
  return linhas.slice(0, 3);
}
