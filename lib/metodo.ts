// Página de vendas /metodo — textos, links e teste. Edite aqui sem mexer na página.

export const PRODUCT_NAME = 'Método Pare de Fumar'

// checkout da Cakto
export const CHECKOUT_URL = 'https://pay.cakto.com.br/p3vrbo9_937565'

// imagens (se alguma não carregar, o bloco dela some sozinho)
export const BANNER_URL =
  'https://cdn-checkout.cakto.com.br/images/4fc63a38-65bb-46d9-9f9f-4da8c19cae92.png?width=750&quality=75&format=webp'
export const IMG_DOR =
  'https://portaldrauziovarella.nyc3.digitaloceanspaces.com/wp-content/uploads/2022/08/22184317/Depositphotos_279523644_XL-Copia.jpg'
export const IMG_HOSPITAL = 'https://pareidefumar.com.br/bryan.jpg'

// "O que tem dentro": preencha com o índice real. Vazio = o bloco não aparece.
export const INSIDE: string[] = []

// Teste de dependência (Fagerström): [texto, pontos]
export const TEST: { q: string; options: [string, number][] }[] = [
  {
    q: 'Quanto tempo depois de acordar você fuma o primeiro cigarro?',
    options: [
      ['5 minutos', 3],
      ['De 6 a 30 minutos', 2],
      ['1 hora ou mais', 1],
    ],
  },
  {
    q: 'Você sente falta do cigarro quando está em locais onde ele é proibido (como cinemas, teatros, restaurantes e voos)?',
    options: [
      ['Sim', 1],
      ['Não', 0],
    ],
  },
  {
    q: 'De qual cigarro você não abre mão?',
    options: [
      ['O primeiro ao acordar', 1],
      ['Qualquer outro', 0],
    ],
  },
  {
    q: 'Quantos cigarros você fuma por dia?',
    options: [
      ['Dez ou menos', 0],
      ['De onze a vinte', 1],
      ['De 21 a trinta', 2],
      ['31 ou mais', 3],
    ],
  },
  {
    q: 'Você fuma com mais frequência nas primeiras horas após acordar do que no restante do dia?',
    options: [
      ['Sim', 1],
      ['Não', 0],
    ],
  },
  {
    q: 'Mesmo quando está doente, a ponto de não sair da cama, você continua fumando?',
    options: [
      ['Sim', 1],
      ['Não', 0],
    ],
  },
]

export function levelOf(score: number) {
  if (score <= 2)
    return {
      title: 'Não há dependência',
      text: 'Seu corpo depende pouco da nicotina. O que mais pesa costuma ser o hábito, e hábito se muda com um plano.',
    }
  if (score <= 4)
    return {
      title: 'Baixa dependência',
      text: 'Com um plano e apoio na hora da vontade, as chances de parar são boas.',
    }
  if (score <= 6)
    return {
      title: 'Dependência média',
      text: 'Parar sem um plano costuma ser difícil. Ter um método e apoio na hora da vontade faz diferença.',
    }
  return {
    title: 'Alta dependência',
    text: 'Vale conversar com um médico sobre tratamento (o SUS oferece acompanhamento gratuito). Um plano e apoio no dia a dia também ajudam muito.',
  }
}
