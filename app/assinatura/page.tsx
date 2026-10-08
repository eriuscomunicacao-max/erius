import Cabecalho from "@/components/Cabecalho";
import Enviar from "@/components/Enviar";
import { Valor } from "@/components/Privacidade";
import { getEmpresa } from "@/lib/empresa";
import { getAssinatura, precoDoPlano } from "@/lib/assinatura";
import { estadoDe, diasRestantes } from "@/lib/assinatura-regras";
import { db } from "@/lib/supabase";
import { brl, dataBR } from "@/lib/format";
import { iniciarAssinatura, abrirCobranca, cancelarMinhaAssinatura, sairDaTelaAssinatura } from "../assinatura-actions";

export const dynamic = "force-dynamic";

export default async function Assinatura({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  const [emp, a] = await Promise.all([getEmpresa(), getAssinatura()]);
  const { data: { user } } = await db().auth.getUser();
  const estado = a ? estadoDe(a) : "expirado";
  const preco = precoDoPlano();
  const pagoAte = a?.pago_ate ? a.pago_ate.slice(0, 10) : null;
  const cancelada = a?.status === "cancelado";
  const temAssinatura = !!a?.asaas_subscription_id && !cancelada;

  return (
    <>
      <Cabecalho titulo="Assinatura" sub="Plano, pagamento e acesso" />
      <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-5">
        {searchParams.erro && <p className="rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
        {searchParams.ok && <p className="rounded-lg border border-ciano/40 p-3 text-sm text-ciano">{searchParams.ok}</p>}

        <section className="painel p-5">
          <h2 className="titulo mb-1">Seu plano</h2>
          {estado === "gratis" && <p className="text-ink">Acesso livre. Nenhuma cobrança.</p>}
          {estado === "trial" && (
            <p className="text-ink">
              Teste grátis: <b>{diasRestantes(a!.trial_ate)} dia(s) restante(s)</b>. Assine agora para não perder o acesso.
            </p>
          )}
          {estado === "ativo" && (
            <p className="text-ink">
              Assinatura <b>{cancelada ? "cancelada" : "ativa"}</b>. Acesso garantido até <b>{dataBR(pagoAte!)}</b>
              {cancelada ? "." : ", renovando automaticamente a cada pagamento."}
            </p>
          )}
          {estado === "expirado" && (
            <p className="text-magenta">
              Seu acesso está bloqueado. Assine para voltar a usar. <span className="text-mute">Seus dados continuam guardados.</span>
            </p>
          )}
          {estado !== "gratis" && (
            <p className="mt-2 text-sm text-mute">
              Plano mensal: <span className="font-semibold text-ink"><Valor>{brl(preco)}</Valor></span> por mês · pague por Pix, boleto ou cartão.
            </p>
          )}
        </section>

        {(estado === "trial" || estado === "expirado" || (estado === "ativo" && cancelada)) && (
          <section className="painel p-5">
            <h2 className="titulo mb-3">Assinar</h2>
            <form action={iniciarAssinatura} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="rotulo" htmlFor="nome">Nome ou razão social</label>
                <input id="nome" name="nome" defaultValue={emp.nome} required className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="cpf_cnpj">CPF ou CNPJ</label>
                <input id="cpf_cnpj" name="cpf_cnpj" defaultValue={emp.cnpj ?? ""} required inputMode="numeric" className="campo" placeholder="Só números" />
              </div>
              <div>
                <label className="rotulo" htmlFor="email">E-mail para a cobrança</label>
                <input id="email" name="email" type="email" defaultValue={user?.email ?? ""} required className="campo" />
              </div>
              <div className="sm:col-span-2">
                <Enviar>Assinar por <Valor>{brl(preco)}</Valor>/mês</Enviar>
                <p className="mt-2 text-xs text-mute">
                  Você será levado à página segura de pagamento da Asaas. O acesso é liberado automaticamente quando o pagamento é confirmado.
                  {estado === "trial" && " A primeira cobrança vence quando o teste terminar."}
                </p>
              </div>
            </form>
          </section>
        )}

        {temAssinatura && (
          <section className="painel flex flex-wrap items-center gap-3 p-5">
            <form action={abrirCobranca}><button className="botao2">Ver cobrança em aberto</button></form>
            <form action={cancelarMinhaAssinatura}><button className="botao2 text-magenta">Cancelar assinatura</button></form>
            <p className="w-full text-xs text-mute">Cancelando, você mantém o acesso até o fim do período já pago.</p>
          </section>
        )}

        {estado === "expirado" && (
          <form action={sairDaTelaAssinatura}><button className="text-sm text-mute underline">Sair da conta</button></form>
        )}
      </div>
    </>
  );
}
