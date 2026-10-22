// Dados do produto "Planilha". Usado no navegador e no servidor (não importe nada de servidor aqui). 
export const PLANILHA = {
  id: "planilha-grafica",
  nome: "Planilha para Gráfica e Comunicação Visual",
  valor: 19.9, // preço do produto na Cakto (sem a taxa de serviço do checkout)
  moeda: "BRL",
  checkout: "https://pay.cakto.com.br/3s7ccp7_1231642",
} as const;

// id de clique que a gente manda pro checkout (parâmetros sck e src) e que volta no webhook
export const CLICK_RE = /pl_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
