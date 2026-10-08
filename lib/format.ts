const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v: number) => brlFmt.format(v || 0);
export const num = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);
export const pct = (v: number, d = 1) =>
  `${(isFinite(v) ? v * 100 : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const mesAtual = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const hoje = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${mesAtual()}-${String(d.getDate()).padStart(2, "0")}`;
};
export const mesDe = (data: string) => data.slice(0, 7);
export const somaMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const mesCurto = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];
export const mesLongo = (mes: string) => `${MESES_LONGO[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
export const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
export const ultimoDia = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
};

// Número pra campo de formulário: 362.8 → "362,80"
export const paraCampo = (v: number) => Number(v || 0).toFixed(2).replace(".", ",");
