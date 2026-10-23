import type { Metadata } from "next";
import { Cta, StickyCta } from "@/components/planilha/Cta";
import PlanilhaTracking from "@/components/planilha/PlanilhaTracking";
import CookiesPlanilha from "@/components/planilha/CookiesPlanilha";

// Cores de impressão (CMYK): ciano, magenta, amarelo e preto. É a linguagem de quem trabalha em gráfica.
const CMYK = [
  { bg: "bg-[#00AEEF]", txt: "text-[#04121f]", top: "border-t-[#00AEEF]", left: "border-l-[#00AEEF]" },
  { bg: "bg-[#EC008C]", txt: "text-white", top: "border-t-[#EC008C]", left: "border-l-[#EC008C]" },
  { bg: "bg-[#FFD500]", txt: "text-[#1A1A1A]", top: "border-t-[#FFD500]", left: "border-l-[#FFD500]" },
  { bg: "bg-[#1A1A1A]", txt: "text-white", top: "border-t-[#1A1A1A]", left: "border-l-[#1A1A1A]" },
];

/** Barra de teste de cor, igual à que aparece na margem de uma impressão. */
function CmykBar({ className = "h-1.5" }: { className?: string }) {
  return (
    <div className={`flex w-full ${className}`} aria-hidden="true">
      {CMYK.map((c, i) => (
        <span key={i} className={`flex-1 ${c.bg}`} />
      ))}
    </div>
  );
}

/** Quatro bolinhas C M Y K, para o logo. */
function CmykDots() {
  return (
    <span className="mr-2 inline-flex gap-0.5 align-middle" aria-hidden="true">
      {CMYK.map((c, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${c.bg}`} />
      ))}
    </span>
  );
}

/** Marcas de corte nos cantos, como no fechamento de arquivo para a gráfica. */
function CropMarks({ children }: { children: React.ReactNode }) {
  const m = "absolute h-4 w-4 border-[#1A1A1A]";
  return (
    <div className="relative px-5 py-5">
      <span className={`${m} left-0 top-0 border-l-2 border-t-2`} aria-hidden="true" />
      <span className={`${m} right-0 top-0 border-r-2 border-t-2`} aria-hidden="true" />
      <span className={`${m} bottom-0 left-0 border-b-2 border-l-2`} aria-hidden="true" />
      <span className={`${m} bottom-0 right-0 border-b-2 border-r-2`} aria-hidden="true" />
      {children}
    </div>
  );
}

// ====== AJUSTE AQUI ======
const PRECO_NUM = 19.9;
const TAXA = 0.99; // taxa de serviço que o checkout da Cakto soma. Se a Cakto passar a absorver, troque por 0.
const SUPORTE_WHATSAPP = ""; // só números com DDI, ex.: "5514999999999" (vazio = não mostra)
const SUPORTE_EMAIL = ""; // ex.: "suporte@seudominio.com" (vazio = não mostra)
const VIDEO_URL = ""; // link de EMBED do vídeo da planilha, ex.: "https://www.youtube.com/embed/XXXX" (vazio = não mostra a seção)
const APP_URL = "https://orcagrafica.vercel.app/cadastro";
// Depoimentos REAIS e autorizados. Enquanto a lista estiver vazia, a seção não aparece. Não invente.
const DEPOIMENTOS: { texto: string; nome: string; negocio: string }[] = [];
// =========================

const brl = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");
const PRECO = brl(PRECO_NUM);
const TOTAL = brl(PRECO_NUM + TAXA);
const TAXA_TXT = TAXA > 0 ? `+ ${brl(TAXA)} de taxa do checkout · total ${TOTAL}` : "";
const TEM_SUPORTE = !!(SUPORTE_WHATSAPP || SUPORTE_EMAIL);

const IMG = "https://vsnmypreyzzvldbbrdiz.supabase.co/storage/v1/object/public/planilhas/";
const img = {
  hero: IMG + "hero.png",
  orcamento: IMG + "orcamento.png",
  cobranca: IMG + "cobranca.png",
  total: IMG + "TOtal%20a%20receber.png",
};

export const metadata: Metadata = {
  title: "Planilha para gráfica e comunicação visual | Orçamento, cobrança e lucro",
  description:
    "Pare de perder dinheiro por orçamento errado e saldo esquecido. Planilha pronta para gráfica e comunicação visual: orçamento, pedidos, cobrança, caixa e lucro. Abre no Google Sheets.",
  openGraph: {
    title: "Planilha para gráfica e comunicação visual",
    description: "Orçamento, pedidos, cobrança, caixa e lucro do mês num lugar só.",
    images: [img.hero],
  },
};

const problemas = [
  { t: "O cliente pede o preço de novo", d: "E ninguém acha o valor que foi combinado no WhatsApp." },
  { t: "O sinal foi pago, o saldo foi esquecido", d: "O pedido saiu da gráfica e o resto do dinheiro ficou na rua." },
  { t: "Vende bastante, mas não sabe o lucro", d: "Entrou dinheiro, mas depois de material e despesas ninguém sabe quanto sobrou." },
  { t: "Pedidos e prazos espalhados", d: "Recado em conversa, anotação no caderno e prazo que escapa." },
];

const blocos = [
  {
    tag: "LUCRO E CAIXA",
    titulo: "Saiba quanto realmente sobrou no mês",
    texto: "Um painel com o que entrou, o que saiu e o que ainda falta receber. Atualiza a cada pedido, pagamento e gasto que você lança.",
    itens: ["Faturamento, despesas, lucro e margem do mês", "Total a receber de todos os pedidos", "Caixa atual e extrato de entradas e saídas", "Comparação com o mês anterior"],
    src: img.total,
    alt: "Total a receber e resumo financeiro da planilha",
  },
  {
    tag: "COBRANÇA",
    titulo: "Pare de esquecer dinheiro na mão do cliente",
    texto: "Cada pagamento abate do pedido. O que sobrou aparece numa lista, do maior saldo pro menor.",
    itens: ["Status automático: Pago, Parcial ou Não pago", "Lista de cobrança ordenada pelo maior saldo", "Sinal e saldo registrados em linhas separadas", "Marca quando é cliente novo"],
    src: img.cobranca,
    alt: "Lista de cobrança com saldos em aberto",
  },
  {
    tag: "ORÇAMENTOS",
    titulo: "Orçamento pronto pra imprimir, com os seus preços",
    texto: "Cadastre seus produtos e preços uma vez. Depois é só escolher o item e a planilha calcula o valor por unidade, milheiro ou m².",
    itens: ["Funciona para produtos cobrados por m², milheiro, metro, hora ou unidade", "Prazo, forma de pagamento e validade no documento", "Imprime em A4 com nome e contato da sua gráfica", "Orçamento aprovado vira pedido na própria planilha"],
    src: img.orcamento,
    alt: "Orçamento pronto pra imprimir feito na planilha",
  },
];

const recebe = [
  { t: "Painel de lucro e caixa", d: "Veja faturamento, despesas, margem e saldo sem fazer conta." },
  { t: "Orçamento por m², milheiro e unidade", d: "Menos erro de cálculo e preço sempre no mesmo critério." },
  { t: "Cobrança dos saldos em aberto", d: "Saiba quem ainda deve e quanto, sem depender da memória." },
  { t: "Pedidos com status de pagamento", d: "Pago, parcial ou não pago, atualizado a cada recebimento." },
  { t: "Gastos por categoria, com alerta", d: "Descubra o que está pesando demais nas despesas do mês." },
  { t: "Ordens de serviço com alerta de prazo", d: "Veja o que está atrasado e o que vence hoje ou amanhã." },
  { t: "Seus produtos, materiais e despesas fixas", d: "Tudo cadastrado do seu jeito, com os seus preços." },
  { t: "Versão limpa e versão com exemplos", d: "Aprenda com os exemplos e comece a sua do zero." },
];

const comparacao = [
  { antes: "Preço passado de cabeça e esquecido", depois: "Orçamento calculado pelos preços que você cadastrou" },
  { antes: "Saldo do cliente que ninguém lembra", depois: "Lista de cobrança com quem ainda deve" },
  { antes: "Lucro descoberto no chute, no fim do mês", depois: "Lucro e margem do mês num painel" },
  { antes: "Pedidos e prazos perdidos em conversas", depois: "Pedidos e ordens de serviço com alerta de prazo" },
  { antes: "Caixa na cabeça", depois: "Entradas, saídas e saldo com extrato" },
];

const ePraVoce = [
  "Tem gráfica ou empresa de comunicação visual, pequena ou média",
  "Hoje controla no caderno, no WhatsApp ou em planilhas soltas",
  "Quer saber saldos e lucro sem pagar mensalidade",
  "Sabe abrir uma planilha e preencher uma tabela",
];
const naoEPraVoce = [
  "Quer um sistema automático, com login de funcionário e PDF com a sua logo (isso é o sistema OrçaGrafica)",
  "Não quer lançar pedidos, pagamentos e gastos (a planilha só mostra o que você registra)",
  "Precisa emitir nota fiscal",
];

const passos = [
  { n: "1", t: "Receba o acesso", d: "O link chega no seu e-mail logo após a confirmação do pagamento. Confira também a caixa de spam." },
  { n: "2", t: "Faça uma cópia e explore", d: "A versão com exemplos preenchidos mostra como cada aba funciona." },
  { n: "3", t: "Troque pelos seus dados", d: "Cadastre seus produtos e preços e lance o seu primeiro pedido." },
];

const faq = [
  { q: "O que eu recebo exatamente?", a: "Por e-mail, o acesso à planilha no Google Sheets: uma versão limpa pra você preencher e outra com exemplos preenchidos. Você faz uma cópia na sua conta Google e começa a editar." },
  { q: "Tem mensalidade?", a: "Não. É uma compra única." },
  { q: "Preciso saber usar Excel ou Google Sheets?", a: "Se você sabe digitar numa tabela, consegue usar. As células amarelas são as que você preenche, as cinzas calculam sozinhas, e a aba Comece aqui explica o passo a passo." },
  { q: "Posso colocar meus próprios produtos e preços?", a: "Sim. Você cadastra os seus produtos, os seus preços e escolhe como cobra cada um: unidade, milheiro, m², metro, hora ou serviço." },
  { q: "Posso editar a planilha?", a: "Sim, a cópia é sua. Só não apague as colunas cinzas, porque elas têm as fórmulas." },
  { q: "Funciona no celular?", a: "Funciona pelo app do Google Sheets ou pelo navegador. Para lançar muita coisa de uma vez, o computador é mais confortável." },
  { q: "Serve para gráfica offset e comunicação visual?", a: "Serve para os dois, e também para quem trabalha sozinho. Você cadastra o que vende e como cobra." },
  { q: "Posso usar em mais de um computador?", a: "Sim. Ela fica na sua conta Google e abre em qualquer aparelho em que você entrar nela." },
  { q: "E se o e-mail não chegar?", a: TEM_SUPORTE ? "Confira a caixa de spam e a aba Promoções. Se não encontrar, fale com o suporte informando o e-mail usado na compra." : "Confira a caixa de spam e a aba Promoções do e-mail usado na compra." },
  ...(TEM_SUPORTE ? [{ q: "Tem suporte?", a: "Sim. Se tiver dificuldade para acessar ou usar, fale com a gente pelo contato indicado nesta página." }] : []),
  { q: "Qual a diferença pro sistema OrçaGrafica?", a: "A planilha resolve orçamento, pedidos, cobrança, caixa e lucro. O sistema, com teste grátis de 3 dias, soma o Meu Assessor, o relatório mensal em PDF, o orçamento com a sua logo e o login de funcionário." },
];

function Suporte({ className = "" }: { className?: string }) {
  if (!TEM_SUPORTE) return null;
  return (
    <p className={className}>
      Suporte:{" "}
      {SUPORTE_WHATSAPP && (
        <a href={`https://wa.me/${SUPORTE_WHATSAPP}`} className="text-[#0A86BD] underline">
          WhatsApp
        </a>
      )}
      {SUPORTE_WHATSAPP && SUPORTE_EMAIL && " · "}
      {SUPORTE_EMAIL && (
        <a href={`mailto:${SUPORTE_EMAIL}`} className="text-[#0A86BD] underline">
          {SUPORTE_EMAIL}
        </a>
      )}
    </p>
  );
}

export default function Planilha() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] pb-20 text-slate-700 md:pb-0">
      <PlanilhaTracking />

      {/* topo */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <CmykBar />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-bold text-slate-900">
            <CmykDots />
            Orça<span className="text-[#00AEEF]">Grafica</span> <span className="text-sm font-normal text-slate-500">· Planilha</span>
          </span>
          <Cta className="!px-4 !py-2 text-sm">Comprar por {PRECO}</Cta>
        </div>
      </header>

      {/* hero */}
      <section className="border-b border-slate-200 bg-white px-4 pb-12 pt-14 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Planilha para gráfica e comunicação visual
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Pare de perder dinheiro por <span className="text-[#0A86BD]">orçamento errado</span> e cliente que não paga o saldo
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Orçamentos, pedidos, cobranças, caixa e lucro da sua gráfica numa planilha pronta pra usar. Sem mensalidade e sem instalar nada.
          </p>
          <div className="mt-7 flex flex-col items-center gap-2">
            <Cta className="w-full max-w-md text-center text-base">Quero organizar minha gráfica por {PRECO}</Cta>
            <span className="text-xs text-slate-600">Pagamento único · Pix ou cartão · sem mensalidade</span>
            {TAXA_TXT && <span className="text-xs text-slate-500">{TAXA_TXT}</span>}
            <span className="text-xs text-slate-500">Acesso por e-mail · Abre no Google Sheets · 7 dias de arrependimento</span>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-4xl">
          <CropMarks>
            <img src={img.hero} alt="Planilha de gestão para gráficas" className="w-full rounded-lg border border-slate-200 shadow-xl" />
          </CropMarks>
          <p className="mt-2 text-[11px] text-slate-500">A interface acima é ilustrativa, com valores de exemplo. Você recebe a planilha editável com todas as abas e fórmulas.</p>
        </div>
      </section>
      <CmykBar className="h-2" />

      {/* vídeo (só aparece se VIDEO_URL estiver preenchido) */}
      {VIDEO_URL && (
        <section className="mx-auto max-w-3xl px-4 pt-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">Veja a planilha funcionando</h2>
          <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            <iframe src={VIDEO_URL} title="Planilha funcionando" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </section>
      )}

      {/* problema */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold text-slate-900 md:text-3xl">
          Se você controla sua gráfica no WhatsApp, no caderno ou em planilhas soltas, provavelmente está deixando dinheiro escapar
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {problemas.map((p, i) => (
            <div key={p.t} className={`rounded-xl border border-slate-200 border-t-4 ${CMYK[i % 4].top} bg-white p-5 shadow-sm`}>
              <h3 className="font-semibold text-slate-900">{p.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* solução */}
      <section className="mx-auto max-w-6xl space-y-16 px-4 py-6">
        <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Uma visão simples do que está acontecendo na sua gráfica</h2>
        {blocos.map((b, i) => (
          <div key={b.tag} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
            <div>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wider ${CMYK[i % 3].bg} ${CMYK[i % 3].txt}`}>{b.tag}</span>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{b.titulo}</h3>
              <p className="mt-3 text-slate-600">{b.texto}</p>
              <ul className="mt-5 space-y-2">
                {b.itens.map((it) => (
                  <li key={it} className="flex gap-2 text-sm">
                    <span className="mt-0.5 text-[#0A86BD]">✔</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-xl border border-slate-200 shadow-lg" />
            </div>
          </div>
        ))}
        <div className="text-center">
          <Cta className="w-full max-w-md text-center text-base">Quero a planilha por {PRECO}</Cta>
        </div>
      </section>

      {/* o que você recebe */}
      <section className="mt-16 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">O que você recebe</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {recebe.map((r, i) => (
              <div key={r.t} className={`rounded-lg border border-slate-200 border-l-4 ${CMYK[i % 4].left} bg-slate-50 p-4`}>
                <div className="flex gap-2 font-semibold text-slate-900">
                  <span className="text-[#0A86BD]">✔</span>
                  {r.t}
                </div>
                <p className="mt-1 pl-6 text-sm text-slate-600">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* comparação */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Caderno e WhatsApp contra a planilha</h2>
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-2 text-sm font-semibold">
            <div className="bg-red-50 px-4 py-3 text-red-700">Hoje</div>
            <div className="bg-green-50 px-4 py-3 text-green-700">Com a planilha</div>
          </div>
          {comparacao.map((c) => (
            <div key={c.antes} className="grid grid-cols-2 gap-px border-t border-slate-200 text-sm">
              <div className="px-4 py-3 text-slate-600">✖ {c.antes}</div>
              <div className="px-4 py-3 font-medium text-slate-800">✔ {c.depois}</div>
            </div>
          ))}
        </div>
      </section>

      {/* para quem é */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Para quem é (e para quem não é)</h2>
        <p className="mt-2 text-center text-sm text-slate-500">Feita por quem vive o dia a dia de uma gráfica de comunicação visual.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-green-700">É pra você se</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {ePraVoce.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-green-600">✔</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700">Não é pra você se</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {naoEPraVoce.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-slate-400">✖</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* depoimentos (só aparece quando houver depoimentos reais) */}
      {DEPOIMENTOS.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Quem já usa</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEPOIMENTOS.map((d) => (
              <figure key={d.nome} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <blockquote className="text-sm text-slate-700">“{d.texto}”</blockquote>
                <figcaption className="mt-3 text-xs text-slate-500">
                  <strong className="text-slate-800">{d.nome}</strong> · {d.negocio}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* passos */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Comece com exemplos prontos e adapte à sua gráfica</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {passos.map((p, i) => (
            <div key={p.n} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${CMYK[i % 3].bg} ${CMYK[i % 3].txt}`}>{p.n}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{p.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* oferta */}
      <section className="mx-auto max-w-md px-4 pb-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Planilha completa, compra única</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-[#1A1A1A] bg-white p-7 shadow-lg">
          <CmykBar className="-mx-7 -mt-7 mb-5 h-2.5" />
          <div className="text-xs font-semibold tracking-wider text-[#0A86BD]">PLANILHA PARA GRÁFICA E COMUNICAÇÃO VISUAL</div>
          <div className="mt-2 text-4xl font-extrabold text-slate-900">{PRECO}</div>
          <div className="text-xs text-slate-500">pagamento único · Pix ou cartão · sem mensalidade</div>
          {TAXA_TXT && <div className="mt-1 text-xs text-slate-500">{TAXA_TXT}</div>}
          <ul className="mt-5 space-y-2 text-left text-sm text-slate-700">
            {[
              "Planilha completa pra usar no Google Sheets",
              "Versão limpa + versão com exemplos preenchidos",
              "Orçamento, pedidos, cobrança, caixa e lucro",
              "Acesso por e-mail após a confirmação do pagamento",
            ].map((i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#0A86BD]">✔</span>
                {i}
              </li>
            ))}
          </ul>
          <Cta className="mt-6 w-full text-base">Quero a planilha por {PRECO}</Cta>
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-left text-xs text-slate-700">
            <strong className="text-green-700">7 dias de arrependimento.</strong> Comprou e viu que não serve pra sua gráfica? Você pode pedir o reembolso dentro de 7 dias, conforme o Código de Defesa do Consumidor.
          </div>
          <div className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>Se o e-mail não chegar, confira o spam{TEM_SUPORTE ? " ou fale com o suporte" : ""}.</p>
            <Suporte />
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Dúvidas frequentes</h2>
        <div className="mt-6 space-y-3">
          {faq.map((f) => (
            <details key={f.q} className="group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <summary className="cursor-pointer list-none font-medium text-slate-900">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* chamada final */}
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-8">
          <h2 className="text-2xl font-bold text-slate-900">Pare de depender de caderno, conversas perdidas e contas feitas de cabeça.</h2>
          <p className="mt-2 text-slate-600">Organize sua gráfica hoje.</p>
          <Cta className="mt-5 w-full max-w-md text-center text-base">Comprar a planilha por {PRECO}</Cta>
          {TAXA_TXT && <p className="mt-2 text-xs text-slate-500">{TAXA_TXT}</p>}
        </div>
      </section>

      {/* sistema (secundário, depois da decisão) */}
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <p className="text-sm text-slate-500">
          Depois, se quiser automação, equipe e relatório em PDF, conheça o{" "}
          <a href={APP_URL} className="font-medium text-[#0A86BD] underline">
            sistema OrçaGrafica (3 dias grátis, sem cartão)
          </a>
          .
        </p>
      </section>

      <CmykBar className="h-2" />
      <footer className="bg-white px-4 py-8 text-center text-xs text-slate-500">
        <Suporte className="mb-2" />
        © {new Date().getFullYear()} OrçaGrafica. Imagens ilustrativas, com valores de exemplo.
      </footer>

      <CookiesPlanilha />
      <StickyCta preco={PRECO} />
    </main>
  );
}
