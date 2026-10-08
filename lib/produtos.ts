export const UNIDADES = ["un", "milheiro", "m²", "m", "hora", "serviço"] as const;

export type Produto = {
  id: string; nome: string; categoria: string; unidade: string; preco: number; descricao: string | null; ativo: boolean;
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Total do item conforme a unidade de cobrança do produto. */
export function totalItem(unidade: string, preco: number, qtd: number, largura = 0, altura = 0) {
  if (unidade === "milheiro") return r2((qtd / 1000) * preco);
  if (unidade === "m²") return r2(qtd * largura * altura * preco);
  return r2(qtd * preco);
}

export const rotuloUnidade = (u: string) =>
  ({ un: "por unidade", milheiro: "por milheiro (1.000 un)", "m²": "por m²", m: "por metro", hora: "por hora", "serviço": "por serviço" } as Record<string, string>)[u] ?? `por ${u}`;
