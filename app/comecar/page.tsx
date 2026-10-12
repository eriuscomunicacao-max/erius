import Link from "next/link";
import { redirect } from "next/navigation";
import Enviar from "@/components/Enviar";
import PrimeiroOrcamento from "@/components/PrimeiroOrcamento";
import { getEmpresa } from "@/lib/empresa";
import { getContexto } from "@/lib/contexto";
import { carregarProdutos } from "@/lib/data";
import { UNIDADES, rotuloUnidade } from "@/lib/produtos";
import { sair } from "../auth-actions";
import { salvarContatoInicial, criarPrimeiroProduto, criarPrimeiroOrcamento } from "../comecar-actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;
const NOMES = ["Seus dados", "Seu 1º produto", "Seu 1º orçamento"];

export default async function Comecar({ searchParams }: { searchParams: { erro?: string; feito?: string } }) {
  const emp = await getEmpresa();
  const ctx = await getContexto();
  if (ctx.papel === "equipe") redirect("/producao");
  const feito = UUID.test(searchParams.feito ?? "") ? searchParams.feito! : null;
  if (ctx.ativado && !feito) redirect("/"); // quem já usa o sistema não precisa do passo a passo

  const produtos = await carregarProdutos();
  const temTelefone = (emp.telefone ?? "").replace(/\D/g, "").length >= 10;
  const passo = !temTelefone ? 1 : produtos.length === 0 ? 2 : 3;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {feito ? (
        <section className="painel p-6 text-center" role="status">
          <p className="text-4xl" aria-hidden>🎉</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Pronto! Seu primeiro orçamento está criado</h1>
          <p className="mt-2 text-mute">Abra o PDF para ver como o seu cliente vai receber. O sistema todo já está liberado para você.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={`/orcamentos/${feito}/pdf`} target="_blank" rel="noopener noreferrer" className="botao">Abrir meu orçamento em PDF</a>
            <Link href="/" className="botao2">Entrar no sistema</Link>
          </div>
          {!emp.logo_path && (
            <p className="mt-5 text-xs text-mute">Dica: suba a sua logo em <Link href="/config" className="text-ciano underline">Configurações</Link> para ela aparecer no PDF.</p>
          )}
        </section>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">Vamos montar o seu primeiro orçamento</h1>
          <p className="mt-1 text-mute">São 3 passos rápidos, uns 3 minutos. Depois o sistema todo fica liberado.</p>

          <ol className="my-6 flex items-center gap-2" aria-label="Progresso">
            {NOMES.map((nome, i) => {
              const n = i + 1;
              const ok = n < passo;
              return (
                <li key={nome} className="flex flex-1 items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok ? "bg-ciano text-bg" : n === passo ? "border-2 border-ciano text-ciano" : "border border-line text-mute"}`} aria-current={n === passo ? "step" : undefined}>
                    {ok ? "✓" : n}
                  </span>
                  <span className={`hidden text-xs sm:block ${n === passo ? "text-ink" : "text-mute"}`}>{nome}</span>
                  {n < 3 && <span className="h-px flex-1 bg-line" aria-hidden />}
                </li>
              );
            })}
          </ol>

          {searchParams.erro && <p className="mb-3 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}

          <section className="painel p-5">
            {passo === 1 && (
              <>
                <h2 className="titulo mb-1">Passo 1 de 3 · Seus dados</h2>
                <p className="mb-4 text-sm text-mute">O WhatsApp da sua gráfica aparece nos orçamentos e é por onde a gente fala com você se precisar. A logo é opcional.</p>
                <form action={salvarContatoInicial} className="space-y-3">
                  <div>
                    <label className="rotulo" htmlFor="telefone">WhatsApp da empresa (com DDD)</label>
                    <input id="telefone" name="telefone" required inputMode="tel" defaultValue={emp.telefone ?? ""} className="campo" placeholder="(19) 99999-9999" />
                  </div>
                  <div>
                    <label className="rotulo" htmlFor="logo">Logo da empresa (PNG ou JPG, opcional)</label>
                    <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" className="campo" />
                  </div>
                  <Enviar>Continuar</Enviar>
                </form>
              </>
            )}

            {passo === 2 && (
              <>
                <h2 className="titulo mb-1">Passo 2 de 3 · Seu primeiro produto ou serviço</h2>
                <p className="mb-4 text-sm text-mute">Cadastre algo que você vende, do jeito que você cobra. Depois você adiciona o resto.</p>
                <form action={criarPrimeiroProduto} className="space-y-3">
                  <div>
                    <label className="rotulo" htmlFor="nome">Nome</label>
                    <input id="nome" name="nome" required maxLength={80} className="campo" placeholder="Ex: Banner em lona, Cartão de visita, Adesivo" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="rotulo" htmlFor="unidade">Cobrado por</label>
                      <select id="unidade" name="unidade" className="campo">
                        {UNIDADES.map((u) => <option key={u} value={u}>{rotuloUnidade(u)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="rotulo" htmlFor="preco">Preço (R$)</label>
                      <input id="preco" name="preco" required inputMode="decimal" className="campo" placeholder="0,00" />
                    </div>
                  </div>
                  <p className="text-xs text-mute">Banner e lona costumam ser &quot;por m²&quot;. Cartão de visita, &quot;por milheiro&quot;.</p>
                  <Enviar>Continuar</Enviar>
                </form>
              </>
            )}

            {passo === 3 && (
              <>
                <h2 className="titulo mb-1">Passo 3 de 3 · Seu primeiro orçamento</h2>
                <p className="mb-4 text-sm text-mute">Escolha um cliente e o produto. Ao salvar, você já vê o PDF e o sistema é liberado.</p>
                <PrimeiroOrcamento
                  action={criarPrimeiroOrcamento}
                  produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, unidade: p.unidade, preco: p.preco }))}
                />
              </>
            )}
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-mute">
            <Link href="/assinatura" className="underline">Quero assinar agora</Link>
            <form action={sair}><button className="underline">Sair da conta</button></form>
          </div>
        </>
      )}
    </div>
  );
}
