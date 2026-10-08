export const SERVICOS = [
  "Impressão digital",
  "Adesivos/Etiquetas",
  "Banners/Faixas",
  "Placas/Sinalização",
  "Offset",
  "Outros",
] as const;

export const CATEGORIAS_GASTO = [
  "Material",
  "Anúncios (Ads)",
  "Parcelas de equipamento",
  "Contas fixas",
  "Embalagem/Frete",
  "Pró-labore",
  "Impostos (DAS)",
  "Caixa da empresa",
  "Outros",
] as const;

// Retirada do dono: sai do caixa, mas não é despesa da operação (não entra no lucro)
export const NAO_DESPESA = ["Pró-labore"];

// Limites (% do total de despesas) para o semáforo das categorias
export const LIMITES: Record<string, { amarelo: number; vermelho: number }> = {
  "Anúncios (Ads)": { amarelo: 0.15, vermelho: 0.25 },
  Material: { amarelo: 0.4, vermelho: 0.6 },
  "Parcelas de equipamento": { amarelo: 0.2, vermelho: 0.35 },
  "Contas fixas": { amarelo: 0.2, vermelho: 0.3 },
  "Embalagem/Frete": { amarelo: 0.08, vermelho: 0.15 },
  Outros: { amarelo: 0.1, vermelho: 0.2 },
  "Pró-labore": { amarelo: 2, vermelho: 2 },
  "Impostos (DAS)": { amarelo: 2, vermelho: 2 },
  "Caixa da empresa": { amarelo: 2, vermelho: 2 },
};

export const CORES = ["#00AEEF", "#EC008C", "#FFF200", "#F5F5F5", "#6B6B6B", "#33C3F2", "#F0339C"];

export const FORMAS = ["Pix", "Dinheiro", "Cartão", "Boleto"] as const;
