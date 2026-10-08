import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Cabecalho from "@/components/Cabecalho";
import ConvidarForm from "@/components/ConvidarForm";
import CopiarLink from "@/components/CopiarLink";
import Excluir from "@/components/Excluir";
import { Valor } from "@/components/Privacidade";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { precoDoPlano } from "@/lib/assinatura";
import { estadoDe } from "@/lib/assinatura-regras";
import { extrasNecessarios, valorMensal, FUNCIONARIOS_INCLUIDOS } from "@/lib/assentos";
import { situacaoEquipe, ajustarAssentos } from "@/lib/equipe";
import { brl, dataBR } from "@/lib/format";
import { convidarFuncionario, cancelarConvite, removerFuncionario } from "../equipe-actions";

export const dynamic = "force-dynamic";

type Membro = { user_id: string; papel: string; nome: string | null; email: string | null };
type Convite = { id: string; nome: string | null; token: string; expira_em: string };

export default async function Equipe({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  const emp = await getEmpresa();
  if ((await meuPapel()) !== "dono") redirect("/producao");

  let s = await situacaoEquipe(emp.id);
  // convite que venceu sem uso libera a vaga (e baixa a cobrança)
  const desejado = extrasNecessarios(s.equipe, s.pendentes);
  if (s.a && desejado < (s.a.assentos_extra ?? 0)) {
    try { await ajustarAssentos(emp.id, desejado); s = await situacaoEquipe(emp.id); } catch (e) { console.error("equipe/sync:", e); }
  }

  const sb = db();
  const [{ data: membros }, { data: convites }] = await Promise.all([
    sb.from("membros").select("user_id, papel, nome, email").eq("empresa_id", emp.id).order("created_at"),
    sb.from("convites").select("id, nome, token, expira_em").is("usado_em", null).gt("expira_em", new Date().toISOString()).order("criado_em"),
  ]);
  const equipe = ((membros ?? []) as Membro[]).filter((m) => m.papel === "equipe");
  const dono = ((membros ?? []) as Membro[]).find((m) => m.papel === "dono");
  const pendentes = (convites ?? []) as Convite[];

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";

  const preco = precoDoPlano();
  const extrasAtuais = s.a?.assentos_extra ?? 0;
  const proximoCusta = extrasNecessarios(s.equipe, s.pendentes + 1) > extrasAtuais;
  const ativa = s.a ? estadoDe(s.a) === "ativo" : false;

  return (
    <>
      <Cabecalho titulo="Equipe" sub="Convide funcionários para ver só a produção" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-5">
        {searchParams.erro && <p className="rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
        {searchParams.ok && <p className="rounded-lg border border-ciano/40 p-3 text-sm text-ciano">{searchParams.ok}</p>}

        <section className="painel p-5">
          <h2 className="titulo mb-1">Como funciona</h2>
          <p className="text-sm text-ink/90">
            O funcionário entra com login próprio, em qualquer computador, e vê apenas as <b>Ordens de Serviço em produção</b> (itens, quantidades, prazo e o arquivo de layout). Ele <b>não vê valores, caixa, clientes, orçamentos nem configurações</b>.
          </p>
          <p className="mt-2 text-sm text-mute">
            {FUNCIONARIOS_INCLUIDOS} funcionário incluso na assinatura. Cada funcionário adicional soma <span className="text-ink"><Valor>{brl(preco)}</Valor></span>/mês.
            {extrasAtuais > 0 && <> Sua mensalidade atual: <span className="text-ink"><Valor>{brl(valorMensal(preco, extrasAtuais))}</Valor></span> ({extrasAtuais} adicional{extrasAtuais > 1 ? "is" : ""}).</>}
          </p>
        </section>

        <section className="painel p-5">
          <h2 className="titulo mb-3">Convidar funcionário</h2>
          <ConvidarForm action={convidarFuncionario} custo={proximoCusta} custoTxt={brl(preco)} />
          {proximoCusta && !ativa && (
            <p className="mt-2 text-xs text-amarelo">Para adicionar mais de {FUNCIONARIOS_INCLUIDOS} funcionário, ative a assinatura primeiro.</p>
          )}
          <p className="mt-2 text-xs text-mute">O convite vale por 7 dias e só funciona uma vez. A vaga adicional entra na cobrança a partir da próxima fatura.</p>
        </section>

        {pendentes.length > 0 && (
          <section className="painel p-5">
            <h2 className="titulo mb-3">Convites pendentes</h2>
            <ul className="space-y-3">
              {pendentes.map((c) => (
                <li key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{c.nome ?? "Funcionário"} <span className="text-xs text-mute">· vence em {dataBR(c.expira_em.slice(0, 10))}</span></span>
                    <Excluir action={cancelarConvite} id={c.id} texto="Cancelar este convite?" />
                  </div>
                  <CopiarLink link={`${proto}://${host}/convite/${c.token}`} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="painel p-5">
          <h2 className="titulo mb-3">Quem tem acesso</h2>
          <ul className="divide-y divide-line text-sm">
            <li className="flex items-center justify-between py-2">
              <span className="text-ink">{dono?.email ?? "Você"} <span className="text-xs text-mute">· dono (acesso total)</span></span>
            </li>
            {equipe.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between py-2">
                <span className="text-ink">{m.nome ?? "Funcionário"} <span className="text-xs text-mute">· {m.email} · só produção</span></span>
                <Excluir action={removerFuncionario} id={m.user_id} texto={`Remover ${m.nome ?? "este funcionário"}? O acesso dele acaba na hora.`} />
              </li>
            ))}
            {equipe.length === 0 && <li className="py-2 text-mute">Nenhum funcionário ainda.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
