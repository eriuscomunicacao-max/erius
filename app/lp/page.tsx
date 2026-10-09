/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

/* ====== EDITE AQUI ====== */
const WHATSAPP = "";            // só números com DDI+DDD, ex: "5519999999999". Vazio = esconde os botões de WhatsApp.
const PRECO = "49,90";          // mensalidade (igual à variável PLANO_VALOR do Netlify)
const IMG = "https://vsnmypreyzzvldbbrdiz.supabase.co/storage/v1/object/public/fotos-site";
/* ========================= */

export const metadata: Metadata = {
  title: "OrçaGrafica — Orçamento, ordem de serviço e financeiro para gráficas",
  description:
    "Sistema para gráficas e comunicação visual: orçamento em PDF com a sua logo, ordens de serviço, controle de caixa e equipe de produção. Teste grátis por 3 dias.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "OrçaGrafica — gestão para gráficas e comunicação visual",
    description: "Orçamento em PDF, ordens de serviço, caixa e equipe de produção num só lugar. Teste grátis por 3 dias.",
    images: [`${IMG}/dashboard.png`],
    type: "website",
    locale: "pt_BR",
  },
};

type Recurso = { id: string; titulo: string; chamada: string; texto: string; itens: string[]; img: string; alt: string };

const RECURSOS: Recurso[] = [
  {
    id: "dashboard", titulo: "Dashboard", chamada: "O mês inteiro numa tela só",
    texto: "Abriu o sistema, já sabe como a gráfica está: quanto vendeu, quanto gastou e quanto sobrou.",
    itens: ["Faturamento, despesas e lucro líquido do período", "Top clientes e produtos mais vendidos", "Gráficos comparando os últimos 6 meses", "Insights do que merece a sua atenção agora"],
    img: "dashboard.png", alt: "Dashboard financeiro do OrçaGrafica",
  },
  {
    id: "orcamentos", titulo: "Orçamentos", chamada: "Orçamento profissional em PDF, com a sua logo e as suas cores",
    texto: "Monte a proposta em minutos escolhendo do seu catálogo, e mande um PDF bonito pro cliente.",
    itens: ["Cadastre seus produtos e serviços do jeito que você cobra: unidade, milheiro, m², metro, hora", "Cálculo de m² e de milheiro automático", "Cliente aprovou? Vira ordem de serviço com um clique", "PDF com logo, cores, prazo e condições de pagamento"],
    img: "orcamentos.png", alt: "Tela de orçamentos",
  },
  {
    id: "os", titulo: "Ordens de Serviço", chamada: "Produção sob controle, do pedido à entrega",
    texto: "Cada serviço com prazo, status e o arquivo do layout junto. Nada se perde no caminho.",
    itens: ["Etapas: aberta, em produção, pronta e entregue", "Alerta de atrasada, entrega hoje e entrega amanhã", "Anexe o layout (imagem ou PDF) na própria OS", "Receba o saldo, avise o cliente no WhatsApp e imprima a OS"],
    img: "os.png", alt: "Tela de ordens de serviço",
  },
  {
    id: "clientes", titulo: "Clientes e Pedidos", chamada: "Saiba exatamente quem falta pagar",
    texto: "Sinal na aprovação, saldo na entrega. O sistema mostra quem deve tudo e quem pagou só uma parte.",
    itens: ["Histórico de pedidos e pagamentos por cliente", "Painel de quem falta pagar: devendo tudo e pagou parte", "Receba o saldo com um clique, sem planilha", "Marcação de cliente novo"],
    img: "clientes.png", alt: "Tela de clientes e pedidos",
  },
  {
    id: "assessor", titulo: "Meu Assessor", chamada: "Pare de misturar o dinheiro da gráfica com o seu",
    texto: "O dinheiro que entra é dividido em envelopes: material, tráfego, pró-labore e caixa da empresa. Você enxerga o que já pode gastar.",
    itens: ["Divide o que foi recebido, não só o que foi vendido", "Aviso de quando já dá pra repor o material", "Retorno do dinheiro investido em anúncios", "Retirada de pró-labore sem bagunçar o lucro"],
    img: "assessor.png", alt: "Tela do Meu Assessor com os envelopes",
  },
  {
    id: "fluxo", titulo: "Fluxo de Caixa", chamada: "Entradas, saídas e saldo, dia a dia",
    texto: "Veja o que entrou, o que saiu e quanto tem em caixa agora, mês a mês.",
    itens: ["Saldo no início do mês e caixa atual", "Entradas e saídas do período", "Resultado do mês de relance"],
    img: "fluxo.png", alt: "Tela do fluxo de caixa",
  },
  {
    id: "faturamento", titulo: "Faturamento e Lucro", chamada: "Descubra se o mês deu lucro de verdade",
    texto: "Compare faturamento, despesas e lucro mês a mês e veja a margem. Sem conta de cabeça.",
    itens: ["Faturamento, despesas e lucro lado a lado", "Margem de lucro por mês", "Evolução ao longo do tempo"],
    img: "faturamento.png", alt: "Tela de faturamento e lucro",
  },
  {
    id: "relatorio", titulo: "Relatório Mensal", chamada: "O fechamento do mês pronto, em PDF",
    texto: "No fim do mês, um relatório com os números, os envelopes, o tráfego, as OS e recomendações do que fazer no próximo.",
    itens: ["PDF pronto pra guardar ou mandar pro sócio", "Recomendações automáticas com base nos seus números", "Meta sugerida pro próximo mês"],
    img: "realtorio.png", alt: "Tela do relatório mensal",
  },
  {
    id: "config", titulo: "Configurações", chamada: "Com a cara da sua gráfica",
    texto: "Suba a sua logo, escolha as cores e preencha seus dados. Tudo isso aparece nos PDFs que o cliente recebe.",
    itens: ["Logo, cores, CNPJ e telefone nos orçamentos e ordens de serviço", "Despesas fixas e caixa inicial", "Prazo e forma de pagamento padrão dos orçamentos"],
    img: "cofnig.png", alt: "Tela de configurações",
  },
];

const OUTROS = [
  { t: "Produtos e serviços livres", d: "Cadastre o que a sua gráfica vende, com o nome e o preço que quiser. Serve para gráfica digital, offset e comunicação visual." },
  { t: "Materiais", d: "Controle vinil, papel, lona, tinta e o que mais você compra, com custo e fornecedor." },
  { t: "Gastos por categoria", d: "Lance cada despesa e acompanhe o peso de cada categoria no mês." },
  { t: "Esconde os valores com 1 clique", d: "O olhinho no topo oculta todos os valores da tela. Ótimo pra usar na frente de cliente." },
];

const FAQ = [
  { p: "Preciso instalar alguma coisa?", r: "Não. O OrçaGrafica funciona no navegador, no computador ou no celular. Você entra com e-mail e senha." },
  { p: "Funciona para gráfica offset e para comunicação visual?", r: "Sim. Você cadastra os seus próprios produtos e serviços e escolhe como cobrar: por unidade, milheiro, m², metro, hora ou serviço." },
  { p: "O que acontece depois dos 3 dias de teste?", r: "Você assina para continuar usando. Se não assinar, o acesso é bloqueado, mas seus dados continuam guardados." },
  { p: "Preciso de cartão de crédito para testar?", r: "Não. O teste de 3 dias começa só com o cadastro. Para assinar, você paga por Pix, boleto ou cartão." },
  { p: "Meus dados ficam misturados com os de outras gráficas?", r: "Não. Cada empresa tem seus dados isolados, e ninguém de fora consegue ver as suas informações." },
  { p: "Como funciona o acesso dos funcionários?", r: "Você convida por um link e cada funcionário cria o próprio login. Ele vê apenas as ordens de serviço em produção, sem valores. O primeiro funcionário já está incluso; cada adicional soma o valor da assinatura." },
  { p: "Posso cancelar quando quiser?", r: "Pode. O cancelamento é feito dentro do próprio sistema, na tela de assinatura, e você mantém o acesso até o fim do período já pago." },
];

const wa = (msg: string) => (WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}` : null);

export default function LandingPage() {
  const falar = wa("Olá! Quero saber mais sobre o OrçaGrafica.");
  return (
    <div className="bg-bg text-ink">
      {/* ---------- topo ---------- */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="font-display text-xl font-bold">
            Orça<span className="text-ciano">Grafica</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-mute md:flex" aria-label="Seções">
            <a href="#recursos" className="hover:text-ink">Recursos</a>
            <a href="#equipe" className="hover:text-ink">Equipe</a>
            <a href="#preco" className="hover:text-ink">Preço</a>
            <a href="#faq" className="hover:text-ink">Dúvidas</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="botao2 py-1.5 text-sm">Entrar</Link>
            <Link href="/cadastro" className="botao py-1.5 text-sm">Testar grátis</Link>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(0,174,239,0.20),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-14 text-center lg:pt-20">
          <p className="mx-auto mb-4 inline-block rounded-full border border-ciano/40 bg-ciano/10 px-3 py-1 text-xs font-semibold text-ciano">
            Para gráficas e comunicação visual
          </p>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Orçamento, ordem de serviço e financeiro da sua gráfica <span className="text-ciano">num só lugar</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-mute">
            Chega de planilha, caderno e zap. Monte orçamentos em PDF com a sua logo, controle a produção e saiba quanto sobrou no fim do mês.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/cadastro" className="botao px-6 py-3 text-base">Testar 3 dias grátis</Link>
            <a href="#recursos" className="botao2 px-6 py-3 text-base">Ver o sistema por dentro</a>
          </div>
          <p className="mt-3 text-sm text-mute">Sem cartão de crédito · Cancele quando quiser</p>

          <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-line bg-panel p-2 shadow-[0_30px_80px_-20px_rgba(0,174,239,0.35)]">
            <img src={`${IMG}/dashboard.png`} alt="Dashboard financeiro do OrçaGrafica" className="w-full rounded-xl" />
          </div>
        </div>
      </section>

      {/* ---------- dores ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Se a sua gráfica funciona assim, está perdendo dinheiro</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Orçamento no WhatsApp e na cabeça", "O cliente pede, você calcula de cabeça, esquece o que prometeu e depois não sabe se fechou."],
            ["Planilha que ninguém atualiza", "O dinheiro entra e sai e, no fim do mês, ninguém sabe se deu lucro de verdade."],
            ["Produção na base do recado", "O funcionário pergunta o que fazer, o prazo escapa e o layout se perde na conversa."],
          ].map(([t, d]) => (
            <div key={t} className="painel p-5">
              <h3 className="font-display text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-mute">{d}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-mute">
          O OrçaGrafica nasceu dentro de uma gráfica de comunicação visual, para resolver o dia a dia de verdade: do orçamento ao dinheiro no caixa.
        </p>
      </section>

      {/* ---------- recursos (um bloco por menu) ---------- */}
      <section id="recursos" className="scroll-mt-16 border-t border-line/70 bg-panel/30 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-3xl font-bold">Tudo o que a sua gráfica precisa, em um só sistema</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-mute">Veja cada tela por dentro.</p>

          <div className="mt-14 space-y-20">
            {RECURSOS.map((r, i) => (
              <article key={r.id} id={r.id} className="grid scroll-mt-20 items-center gap-8 lg:grid-cols-2">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <p className="text-sm font-semibold uppercase tracking-wide text-ciano">{r.titulo}</p>
                  <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{r.chamada}</h3>
                  <p className="mt-3 text-mute">{r.texto}</p>
                  <ul className="mt-5 space-y-2.5">
                    {r.itens.map((t) => (
                      <li key={t} className="flex gap-2.5 text-[15px]">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ciano/15 text-xs text-ciano" aria-hidden>✓</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`rounded-2xl border border-line bg-panel p-2 shadow-xl ${i % 2 ? "lg:order-1" : ""}`}>
                  <img src={`${IMG}/${r.img}`} alt={r.alt} loading="lazy" className="w-full rounded-xl" />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTROS.map((o) => (
              <div key={o.t} className="painel p-5">
                <h3 className="font-display text-base font-semibold">{o.t}</h3>
                <p className="mt-2 text-sm text-mute">{o.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- equipe ---------- */}
      <section id="equipe" className="scroll-mt-16 mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ciano">Equipe</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Seu funcionário vê a produção. Só isso.</h2>
            <p className="mt-3 text-mute">
              Convide a equipe por um link. Cada um tem o próprio login e entra de qualquer computador, vendo apenas o que precisa para produzir. Os números da empresa ficam só com você.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ciano">O funcionário vê</h3>
                <ul className="space-y-1.5 text-sm">
                  {["Ordens de serviço em andamento", "Itens e quantidades", "Prazo de entrega", "Observações", "O arquivo de layout"].map((t) => <li key={t}>✓ {t}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-magenta">O funcionário não vê</h3>
                <ul className="space-y-1.5 text-sm text-mute">
                  {["Valores em reais", "Caixa e gastos", "Telefone dos clientes", "Orçamentos", "Configurações e assinatura"].map((t) => <li key={t}>✕ {t}</li>)}
                </ul>
              </div>
            </div>
            <p className="mt-6 text-sm text-mute">
              O primeiro funcionário já está incluso na assinatura. Cada funcionário adicional soma R$ {PRECO} por mês. Se um funcionário sair, você remove o acesso dele na hora.
            </p>
          </div>

          {/* demonstração da tela de Produção (dados fictícios) */}
          <div className="rounded-2xl border border-line bg-panel p-4 shadow-xl" aria-label="Exemplo da tela de produção do funcionário">
            <p className="mb-3 text-xs text-mute">Tela do funcionário (exemplo)</p>
            <div className="space-y-3">
              {[
                { n: "0012", c: "Padaria Central", st: "Em produção", cls: "bg-ciano/15 text-ciano", prazo: "Entrega amanhã", pc: "text-amarelo", itens: ["2x Banner 1x2 m (lona)", "500x Cartão de visita 4x4 cores"] },
                { n: "0013", c: "Auto Peças Silva", st: "Aberta", cls: "bg-amarelo/15 text-amarelo", prazo: "Entrega em 4 dias", pc: "text-mute", itens: ["100x Etiqueta 5x5 cm", "1x Adesivação de porta"] },
              ].map((o) => (
                <div key={o.n} className="rounded-xl border border-line bg-bg p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-mute">OS #{o.n}</span>
                    <span className="font-medium">{o.c}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${o.cls}`}>{o.st}</span>
                    <span className={`ml-auto text-xs ${o.pc}`}>{o.prazo}</span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-sm">{o.itens.map((t) => <li key={t}>{t}</li>)}</ul>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-10 w-14 items-center justify-center rounded-md border border-line bg-panel text-[10px] font-semibold text-ciano">LAYOUT</span>
                    <span className="rounded-lg bg-ciano px-3 py-1.5 text-xs font-semibold text-bg">{o.st === "Aberta" ? "Iniciar produção" : "Marcar como pronta"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- como funciona ---------- */}
      <section className="border-t border-line/70 bg-panel/30 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-3xl font-bold">Comece em minutos</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Crie sua conta", "Cadastro rápido, sem cartão. Coloque a logo e as cores da sua gráfica."],
              ["2", "Cadastre seus produtos", "Do jeito que você cobra: por unidade, milheiro, m², metro ou serviço."],
              ["3", "Emita o primeiro orçamento", "Escolha o cliente e os itens e mande o PDF. Aprovou? Vira ordem de serviço."],
            ].map(([n, t, d]) => (
              <div key={n} className="painel p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ciano font-display font-bold text-bg">{n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-mute">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- preço ---------- */}
      <section id="preco" className="scroll-mt-16 mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Um preço simples</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-mute">Tudo incluso. Sem taxa de adesão e sem fidelidade.</p>
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-ciano/50 bg-panel p-7 shadow-[0_20px_60px_-20px_rgba(0,174,239,0.4)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-ciano">Plano completo</p>
          <p className="mt-2 font-display text-5xl font-bold">R$ {PRECO}<span className="text-lg font-normal text-mute"> /mês</span></p>
          <ul className="mt-6 space-y-2.5 text-[15px]">
            {[
              "Todos os recursos do sistema",
              "Orçamentos, ordens de serviço e clientes sem limite",
              "PDFs com a sua logo e as suas cores",
              "1 funcionário incluso",
              `Funcionário adicional: + R$ ${PRECO}/mês cada`,
              "Pagamento por Pix, boleto ou cartão",
            ].map((t) => (
              <li key={t} className="flex gap-2.5"><span className="text-ciano" aria-hidden>✓</span><span>{t}</span></li>
            ))}
          </ul>
          <Link href="/cadastro" className="botao mt-7 w-full py-3 text-base">Testar 3 dias grátis</Link>
          <p className="mt-3 text-center text-xs text-mute">Sem cartão de crédito para começar</p>
        </div>
      </section>

      {/* ---------- dúvidas ---------- */}
      <section id="faq" className="scroll-mt-16 border-t border-line/70 bg-panel/30 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center font-display text-3xl font-bold">Dúvidas frequentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.p} className="painel group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  {f.p}
                  <span className="text-ciano transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm text-mute">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- chamada final ---------- */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Organize a sua gráfica ainda hoje</h2>
        <p className="mt-3 text-mute">Teste por 3 dias, sem cartão. Se não gostar, é só não assinar.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cadastro" className="botao px-6 py-3 text-base">Testar 3 dias grátis</Link>
          {falar && <a href={falar} target="_blank" rel="noopener noreferrer" className="botao2 px-6 py-3 text-base">Falar no WhatsApp</a>}
        </div>
      </section>

      <footer className="border-t border-line/70 px-5 py-8 text-center text-sm text-mute">
        <p className="font-display text-base text-ink">Orça<span className="text-ciano">Grafica</span></p>
        <p className="mt-1">Gestão para gráficas e comunicação visual.</p>
        <p className="mt-3 space-x-4">
          <Link href="/login" className="hover:text-ink">Entrar</Link>
          <Link href="/cadastro" className="hover:text-ink">Criar conta</Link>
          {falar && <a href={falar} target="_blank" rel="noopener noreferrer" className="hover:text-ink">WhatsApp</a>}
        </p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} OrçaGrafica. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
