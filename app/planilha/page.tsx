import type { Metadata } from "next";
import { Cta, StickyCta } from "@/components/planilha/Cta";
import PlanilhaTracking from "@/components/planilha/PlanilhaTracking";
import CookiesPlanilha from "@/components/planilha/CookiesPlanilha";

// ====== AJUSTE AQUI ======
const PRECO_NUM = 19.9;
const TAXA = 0.99; // taxa de serviço que o checkout da Cakto soma. Se a Cakto passar a absorver, troque por 0.
const SUPORTE_WHATSAPP = ""; // só números com DDI, ex.: "5514999999999" (deixe vazio para não mostrar)
const SUPORTE_EMAIL = ""; // ex.: "suporte@seudominio.com" (deixe vazio para não mostrar)
const APP_URL = "https://orcagrafica.vercel.app/cadastro";
// =========================

const brl = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");
const PRECO = brl(PRECO_NUM);
const TOTAL = brl(PRECO_NUM + TAXA);
const TAXA_TXT = TAXA > 0 ? `+ ${brl(TAXA)} de taxa do checkout · total ${TOTAL}` : "";

const IMG = "https://vsnmypreyzzvldbbrdiz.supabase.co/storage/v1/object/public/planilhas/";
const img = {
  hero: IMG + "hero.png",
  orcamento: IMG + "orcamento.png",
  cobranca: IMG + "cobranca.png",
  total: IMG + "TOtal%20a%20receber.png",
};

export const metadata: Metadata = {
  title: "Planilha para gráfica e comunicação visual | Orçamento, pedidos e caixa",
  description:
    "Planilha pronta para dono de gráfica e comunicação visual: orçamento, pedidos, cobrança, caixa e lucro do mês num lugar só. Abre no Google Sheets.",
  openGraph: {
    title: "Planilha para gráfica e comunicação visual",
    description: "Orçamento, pedidos, cobrança, caixa e lucro do mês num lugar só.",
    images: [img.hero],
  },
};

const dores = [
  { t: "Orçamento no WhatsApp e na cabeça", d: "O cliente pergunta o preço de novo e você não lembra o que passou. Uma conta errada e o lucro some." },
  { t: "Cliente que leva e deixa saldo", d: "Pagou o sinal, levou o banner e o resto ficou pra depois. Sem anotar, ninguém lembra quanto falta." },
  { t: "Caixa sem saber o lucro", d: "Vendeu bastante, trabalhou o mês inteiro e no fim não sabe quanto realmente sobrou." },
];

const blocos = [
  {
    tag: "ORÇAMENTOS",
    titulo: "Orçamento pronto pra imprimir, com os seus preços",
    texto: "Cadastre seus produtos e preços uma vez. Depois é só escolher o item e a planilha calcula o valor por unidade, milheiro ou m².",
    itens: ["Funciona para produtos cobrados por m², milheiro, metro, hora ou unidade", "Itens do seu catálogo, com o preço que você definiu", "Prazo, forma de pagamento e validade no documento", "Imprime em A4 com nome e contato da sua gráfica"],
    src: img.orcamento,
    alt: "Orçamento pronto pra imprimir feito na planilha",
  },
  {
    tag: "COBRANÇA",
    titulo: "Saiba exatamente quem ainda te deve",
    texto: "Cada pagamento que entra abate do pedido. O que sobrou aparece numa lista, do maior saldo pro menor.",
    itens: ["Status automático: Pago, Parcial ou Não pago", "Lista de cobrança ordenada pelo maior saldo", "Marca quando é cliente novo", "Registra sinal e saldo em linhas separadas"],
    src: img.cobranca,
    alt: "Lista de cobrança com saldos em aberto",
  },
  {
    tag: "TOTAL A RECEBER",
    titulo: "Veja de relance quanto ainda tem pra receber",
    texto: "O total em aberto, o caixa do mês e o lucro, atualizados a cada pedido e pagamento que você lança.",
    itens: ["Total a receber de todos os pedidos", "Faturamento, despesas, lucro e margem do mês", "Caixa atual e fluxo de entradas e saídas", "Comparação com o mês anterior"],
    src: img.total,
    alt: "Total a receber e resumo financeiro da planilha",
  },
];

const tudo = [
  "Dashboard com lucro, margem e caixa",
  "Orçamentos prontos pra imprimir",
  "Pedidos com status de pagamento",
  "Cobrança dos saldos em aberto",
  "Gastos por categoria, com alerta",
  "Fluxo de caixa com extrato",
  "Faturamento e lucro mês a mês",
  "Ordens de serviço com alerta de prazo",
  "Produtos, materiais e despesas fixas",
  "Versão com exemplos preenchidos",
];

const passos = [
  { n: "1", t: "Receba o acesso", d: "O link chega no seu e-mail logo após a confirmação do pagamento. Confira também a caixa de spam." },
  { n: "2", t: "Faça uma cópia e explore", d: "A versão com exemplos preenchidos mostra como cada aba funciona." },
  { n: "3", t: "Troque pelos seus dados", d: "Cadastre seus produtos e preços e lance o seu primeiro pedido." },
];

const faq = [
  { q: "O que eu recebo exatamente?", a: "Por e-mail, o acesso à planilha no Google Sheets: uma versão limpa pra você preencher e outra com exemplos preenchidos. Você faz uma cópia na sua conta Google e começa a editar." },
  { q: "Tem mensalidade?", a: "Não. É uma compra única." },
  { q: "E se o e-mail não chegar?", a: "Confira a caixa de spam e a aba Promoções. Se não encontrar, fale com o suporte informando o e-mail usado na compra." },
  { q: "Preciso instalar algum programa?", a: "Não. A planilha abre no Google Sheets (gratuito), pelo navegador, no computador ou no celular. Também abre no Excel." },
  { q: "Serve para gráfica offset e comunicação visual?", a: "Serve para os dois. Você cadastra seus próprios produtos e escolhe como cobra cada um." },
  { q: "Qual a diferença pro sistema OrçaGrafica?", a: "A planilha resolve orçamento, pedidos, cobrança, caixa e lucro. O sistema, com teste grátis de 3 dias, soma o Meu Assessor, o relatório mensal em PDF e o login de funcionário." },
];

function Suporte({ className = "" }: { className?: string }) {
  if (!SUPORTE_WHATSAPP && !SUPORTE_EMAIL) return null;
  return (
    <p className={className}>
      Suporte:{" "}
      {SUPORTE_WHATSAPP && (
        <a href={`https://wa.me/${SUPORTE_WHATSAPP}`} className="text-[#33C3F2] underline">
          WhatsApp
        </a>
      )}
      {SUPORTE_WHATSAPP && SUPORTE_EMAIL && " · "}
      {SUPORTE_EMAIL && (
        <a href={`mailto:${SUPORTE_EMAIL}`} className="text-[#33C3F2] underline">
          {SUPORTE_EMAIL}
        </a>
      )}
    </p>
  );
}

export default function Planilha() {
  return (
    <main className="min-h-screen bg-[#070B14] pb-20 text-slate-200 md:pb-0">
      <PlanilhaTracking />

      {/* topo */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070B14]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-bold text-white">
            Orça<span className="text-[#00AEEF]">Grafica</span> <span className="text-sm font-normal text-slate-400">· Planilha</span>
          </span>
          <Cta className="!px-4 !py-2 text-sm">Comprar por {PRECO}</Cta>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden px-4 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#00AEEF]/15 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl">
          <span className="rounded-full border border-[#00AEEF]/40 bg-[#00AEEF]/10 px-3 py-1 text-xs text-[#33C3F2]">
            Planilha pronta para gráfica e comunicação visual
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-white md:text-5xl">
            Orçamento, pedidos e caixa da sua gráfica <span className="text-[#00AEEF]">numa planilha só</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Para dono de gráfica e comunicação visual. Chega de caderno, WhatsApp e planilha bagunçada: veja quanto entrou, quanto falta receber e quanto sobrou.
          </p>
          <div className="mt-7 flex flex-col items-center gap-2">
            <Cta className="text-base">Comprar por {PRECO}</Cta>
            <span className="text-xs text-slate-400">Pagamento único · Pix ou cartão · sem mensalidade</span>
            {TAXA_TXT && <span className="text-xs text-slate-500">{TAXA_TXT}</span>}
            <span className="text-xs text-slate-500">Acesso por e-mail · Abre no Google Sheets</span>
          </div>
        </div>
        <div className="relative mx-auto mt-10 max-w-4xl">
          <img src={img.hero} alt="Planilha de gestão para gráficas" className="w-full rounded-2xl border border-white/10 shadow-[0_0_80px_-20px_#00AEEF]" />
          <p className="mt-2 text-[11px] text-slate-500">A interface acima é ilustrativa, com valores de exemplo. Você recebe a planilha editável com todas as abas e fórmulas.</p>
        </div>
      </section>

      {/* dores */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">Se a sua gráfica funciona assim, está perdendo dinheiro</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {dores.map((d) => (
            <div key={d.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold text-white">{d.t}</h3>
              <p className="mt-2 text-sm text-slate-400">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* blocos */}
      <section className="mx-auto max-w-6xl space-y-16 px-4 py-6">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">O que a planilha resolve pra você</h2>
        {blocos.map((b, i) => (
          <div key={b.tag} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
            <div>
              <span className="text-xs font-semibold tracking-wider text-[#00AEEF]">{b.tag}</span>
              <h3 className="mt-2 text-2xl font-bold text-white">{b.titulo}</h3>
              <p className="mt-3 text-slate-400">{b.texto}</p>
              <ul className="mt-5 space-y-2">
                {b.itens.map((it) => (
                  <li key={it} className="flex gap-2 text-sm">
                    <span className="mt-0.5 text-[#00AEEF]">✔</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-xl border border-white/10 shadow-[0_0_60px_-25px_#00AEEF]" />
            </div>
          </div>
        ))}
      </section>

      {/* tudo que vem */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">Tudo que vem na planilha</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {tudo.map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <span className="text-[#00AEEF]">✔</span>
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* passos */}
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">Comece com exemplos prontos e adapte à sua gráfica</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {passos.map((p) => (
            <div key={p.n} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00AEEF]/15 font-bold text-[#00AEEF]">{p.n}</div>
              <h3 className="mt-3 font-semibold text-white">{p.t}</h3>
              <p className="mt-1 text-sm text-slate-400">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* oferta */}
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">Planilha completa, compra única</h2>
        <div className="mt-6 rounded-2xl border border-[#00AEEF]/40 bg-white/[0.03] p-7 shadow-[0_0_60px_-20px_#00AEEF]">
          <div className="text-xs font-semibold tracking-wider text-[#00AEEF]">PLANILHA PARA GRÁFICA E COMUNICAÇÃO VISUAL</div>
          <div className="mt-2 text-4xl font-extrabold text-white">{PRECO}</div>
          <div className="text-xs text-slate-400">pagamento único · Pix ou cartão · sem mensalidade</div>
          {TAXA_TXT && <div className="mt-1 text-xs text-slate-400">{TAXA_TXT}</div>}
          <ul className="mt-5 space-y-2 text-left text-sm">
            {[
              "Planilha completa pra usar no Google Sheets",
              "Versão limpa + versão com exemplos preenchidos",
              "Orçamento, pedidos, cobrança, caixa e lucro",
              "Acesso por e-mail após a confirmação do pagamento",
            ].map((i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#00AEEF]">✔</span>
                {i}
              </li>
            ))}
          </ul>
          <Cta className="mt-6 w-full text-base">Quero a planilha por {PRECO}</Cta>
          <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-xs text-slate-400">
            <p>Direito de arrependimento de 7 dias, conforme o Código de Defesa do Consumidor.</p>
            <p>Se o e-mail não chegar, confira o spam ou fale com o suporte.</p>
            <Suporte />
          </div>
        </div>
      </section>

      {/* app */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#00AEEF]/10 to-transparent p-7 text-center">
          <span className="text-xs font-semibold tracking-wider text-[#00AEEF]">DEPOIS DA PLANILHA</span>
          <h2 className="mt-2 text-2xl font-bold text-white">Quando quiser mais, conheça o sistema OrçaGrafica</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            A planilha já resolve o essencial. O sistema soma o Meu Assessor (um painel que separa o dinheiro da empresa, acompanha o DAS e mostra o retorno dos anúncios), relatório mensal em PDF, orçamento com a sua logo e login de funcionário que não vê valores.
          </p>
          <a
            href={APP_URL}
            className="mt-5 inline-flex rounded-lg border border-[#00AEEF] px-5 py-2.5 text-sm font-semibold text-[#00AEEF] transition hover:bg-[#00AEEF]/10"
          >
            Testar o sistema 3 dias grátis
          </a>
          <div className="mt-2 text-xs text-slate-500">Sem cartão de crédito</div>
        </div>
      </section>

      {/* faq */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold text-white">Dúvidas frequentes</h2>
        <div className="mt-6 space-y-3">
          {faq.map((f) => (
            <details key={f.q} className="group rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <summary className="cursor-pointer list-none font-medium text-white">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-slate-500">
        <Suporte className="mb-2" />
        © {new Date().getFullYear()} OrçaGrafica. Imagens ilustrativas, com valores de exemplo.
      </footer>

      <CookiesPlanilha />
      <StickyCta preco={PRECO} />
    </main>
  );
}
