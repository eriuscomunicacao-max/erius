import Cabecalho from "@/components/Cabecalho";
import Excluir from "@/components/Excluir";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import Calculadora from "@/components/Calculadora";
import { carregar, carregarPadroes } from "@/lib/data";
import { carregarEnvelopes } from "@/lib/assessor";
import { brl } from "@/lib/format";
import { CATEGORIAS_GASTO } from "@/lib/constants";
import { getEmpresa } from "@/lib/empresa";
import { salvarEmpresa, enviarLogo, removerLogo } from "../empresa-actions";
import { salvarConfig, criarFixa, alternarFixa, excluirFixa, atualizarFixa } from "../actions";
import { salvarAssessor, excluirEnvelope, restaurarSugestaoAssessor } from "../assessor-actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import Editar, { Campo } from "@/components/Editar";
import { paraCampo } from "@/lib/format";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

// "Impostos (DAS)" tem reserva própria, por isso não aparece como categoria de envelope
const CATS_ENV = CATEGORIAS_GASTO.filter((c) => c !== "Impostos (DAS)");
const TIPOS = [
  { v: "comum", t: "Comum" },
  { v: "reposicao", t: "Reposição de material (avisa quando dá pra comprar)" },
  { v: "trafego", t: "Anúncios (mostra o retorno do tráfego)" },
];

export default async function Config({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  const [b, envelopes, emp, padroes] = await Promise.all([carregar(), carregarEnvelopes(), getEmpresa(), carregarPadroes()]);
  const somaPct = (envelopes ?? []).reduce((t, e) => t + e.pct, 0);
  const c = b.config;
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");

  return (
    <>
      <Cabecalho titulo="Configurações" sub="Empresa, caixa, padrões do orçamento e despesas fixas" />
      <div className="space-y-4 p-4 lg:p-5">
        {searchParams.erro && <p className="rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
        {searchParams.ok && <p className="rounded-lg border border-ciano/40 p-3 text-sm text-ciano">{searchParams.ok}</p>}
        <section className="painel p-5">
          <h2 className="titulo mb-1">Sua empresa</h2>
          <p className="mb-4 text-xs text-mute">Esses dados, a logo e as cores aparecem nos PDFs de orçamento, ordem de serviço e relatório.</p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              <span className="rotulo">Logo (PNG ou JPG, até 2 MB)</span>
              <form action={enviarLogo} className="space-y-2">
                <input name="logo" type="file" accept="image/png,image/jpeg" required className="campo" aria-label="Arquivo da logo" />
                <Enviar>Enviar logo</Enviar>
              </form>
              {emp.logo_path && (
                <form action={removerLogo}><button className="botao2 text-xs">Remover logo</button></form>
              )}
            </div>
            <form action={salvarEmpresa} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="rotulo" htmlFor="emp-nome">Nome da empresa</label><input id="emp-nome" name="nome" required defaultValue={emp.nome} className="campo" /></div>
              <div><label className="rotulo" htmlFor="emp-cnpj">CNPJ</label><input id="emp-cnpj" name="cnpj" defaultValue={emp.cnpj ?? ""} className="campo" /></div>
              <div><label className="rotulo" htmlFor="emp-tel">Telefone / WhatsApp</label><input id="emp-tel" name="telefone" defaultValue={emp.telefone ?? ""} inputMode="tel" className="campo" /></div>
              <div><label className="rotulo" htmlFor="emp-email">E-mail</label><input id="emp-email" name="email" type="email" defaultValue={emp.email ?? ""} className="campo" /></div>
              <div className="sm:col-span-2"><label className="rotulo" htmlFor="emp-end">Endereço</label><input id="emp-end" name="endereco" defaultValue={emp.endereco ?? ""} className="campo" /></div>
              <div>
                <label className="rotulo" htmlFor="emp-c1">Cor principal dos PDFs</label>
                <input id="emp-c1" name="cor_primaria" type="color" defaultValue={emp.cor_primaria} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-bg p-1" />
              </div>
              <div>
                <label className="rotulo" htmlFor="emp-c2">Cor secundária dos PDFs</label>
                <input id="emp-c2" name="cor_secundaria" type="color" defaultValue={emp.cor_secundaria} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-bg p-1" />
              </div>
              <div className="sm:col-span-2"><Enviar>Salvar dados da empresa</Enviar></div>
            </form>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="painel p-5">
            <h2 className="titulo mb-4">Geral</h2>
            <form action={salvarConfig} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="rotulo" htmlFor="caixa_inicial">Caixa inicial (R$)</label>
                <input id="caixa_inicial" name="caixa_inicial" defaultValue={fmt(c.caixa_inicial)} inputMode="decimal" className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="adicional_prioridade">Adicional produção prioritária (R$)</label>
                <input id="adicional_prioridade" name="adicional_prioridade" defaultValue={fmt(c.adicional_prioridade)} inputMode="decimal" className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="markup_revenda">Markup revenda (%)</label>
                <input id="markup_revenda" name="markup_revenda" defaultValue={fmt(c.markup_revenda)} inputMode="decimal" className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="validade_dias">Validade do orçamento (dias)</label>
                <input id="validade_dias" name="validade_dias" defaultValue={String(padroes.validade)} inputMode="numeric" className="campo" />
              </div>
              <div className="sm:col-span-2">
                <label className="rotulo" htmlFor="prazo_padrao">Prazo de produção padrão</label>
                <input id="prazo_padrao" name="prazo_padrao" defaultValue={padroes.prazo} className="campo" />
              </div>
              <div className="sm:col-span-3">
                <label className="rotulo" htmlFor="pagamento_padrao">Forma de pagamento padrão</label>
                <input id="pagamento_padrao" name="pagamento_padrao" defaultValue={padroes.pagamento} className="campo" />
              </div>
              <div className="sm:col-span-3"><Enviar>Salvar configurações</Enviar></div>
            </form>
          </section>

          <section className="painel p-5">
            <h2 className="titulo mb-3">Despesas fixas mensais</h2>
            <table className="tabela">
              <tbody>
                {b.fixas.map((f) => (
                  <tr key={f.id} className={f.ativo ? "" : "opacity-50"}>
                    <td className="px-0">{f.nome}<div className="text-xs text-mute">{f.categoria}</div></td>
                    <td className="text-right"><Valor>{brl(f.valor)}</Valor></td>
                    <td className="w-24 text-right">
                      <form action={alternarFixa}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="ativo" value={String(f.ativo)} />
                        <button className="botao2 py-1 text-xs">{f.ativo ? "Pausar" : "Ativar"}</button>
                      </form>
                    </td>
                    <td className="w-16 px-0">
                      <div className="flex items-center justify-end">
                        <Editar titulo="Editar despesa fixa" action={atualizarFixa}>
                          <input type="hidden" name="id" value={f.id} />
                          <Campo nome="nome" rotulo="Nome" valor={f.nome} largo />
                          <Campo nome="categoria" rotulo="Categoria" valor={f.categoria} opcoes={CATEGORIAS_GASTO} />
                          <Campo nome="valor" rotulo="Valor (R$)" valor={paraCampo(f.valor)} decimal />
                        </Editar>
                        <Excluir action={excluirFixa} id={f.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <FormReset action={criarFixa} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input name="nome" required placeholder="Nova despesa" className="campo col-span-2 sm:col-span-1" aria-label="Nome" />
              <select name="categoria" className="campo" aria-label="Categoria">{CATEGORIAS_GASTO.map((x) => <option key={x}>{x}</option>)}</select>
              <input name="valor" required inputMode="decimal" placeholder="R$" className="campo" aria-label="Valor" />
              <Enviar className="botao col-span-2 sm:col-span-1">Adicionar</Enviar>
            </FormReset>
          </section>
        </div>

        <section id="assessor" className="painel scroll-mt-20 p-5">
          <h2 className="titulo mb-1">Meu Assessor</h2>
          <p className="mb-4 text-xs text-mute">
            Divida o dinheiro recebido do jeito que fizer sentido para a sua gráfica. Os envelopes abaixo são só uma sugestão: renomeie,
            mude as porcentagens, escolha de onde cada um paga e crie ou remova envelopes.
          </p>
          {envelopes ? (
            <form action={salvarAssessor} className="space-y-4">
              {/* botão padrão invisível: o Enter nos campos salva (em vez de acionar o primeiro "Remover") */}
              <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>Salvar</button>
              <div className="space-y-3">
                {envelopes.map((e) => {
                  const marcadas = [e.categoria, ...e.extras];
                  return (
                    <div key={e.id} className="rounded-lg border border-line p-3">
                      <input type="hidden" name="env_id" value={e.id} />
                      <input type="hidden" name={`principal_${e.id}`} value={e.categoria} />
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_110px_1.3fr_auto]">
                        <div className="col-span-2 md:col-span-1">
                          <label className="rotulo" htmlFor={`nome_${e.id}`}>Nome do envelope</label>
                          <input id={`nome_${e.id}`} name={`nome_${e.id}`} defaultValue={e.nome} maxLength={40} required className="campo" />
                        </div>
                        <div>
                          <label className="rotulo" htmlFor={`pct_${e.id}`}>% do recebido</label>
                          <input id={`pct_${e.id}`} name={`pct_${e.id}`} defaultValue={fmt(e.pct)} inputMode="decimal" className="campo" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="rotulo" htmlFor={`tipo_${e.id}`}>Tipo</label>
                          <select id={`tipo_${e.id}`} name={`tipo_${e.id}`} defaultValue={e.tipo} className="campo">
                            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2 flex items-end md:col-span-1">
                          <BotaoConfirmar
                            formAction={excluirEnvelope} name="excluir" value={e.id}
                            texto={`Remover o envelope "${e.nome}"? Os gastos lançados continuam salvos.`}
                            className="botao2 py-2 text-xs text-magenta"
                          >Remover</BotaoConfirmar>
                        </div>
                      </div>
                      <fieldset className="mt-3">
                        <legend className="rotulo">Quais gastos saem deste envelope</legend>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {CATS_ENV.map((cat) => (
                            <label key={cat} className="flex items-center gap-1.5 text-sm">
                              <input type="checkbox" name={`cats_${e.id}`} value={cat} defaultChecked={marcadas.includes(cat)} className="h-4 w-4 accent-ciano" />
                              {cat}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  );
                })}
              </div>

              <details className="rounded-lg border border-dashed border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ciano">+ Novo envelope</summary>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-[1fr_110px_1.3fr]">
                  <div className="col-span-2 md:col-span-1">
                    <label className="rotulo" htmlFor="nome_novo">Nome do envelope</label>
                    <input id="nome_novo" name="nome_novo" maxLength={40} className="campo" placeholder="Ex: Reserva, Equipamentos" />
                  </div>
                  <div>
                    <label className="rotulo" htmlFor="pct_novo">% do recebido</label>
                    <input id="pct_novo" name="pct_novo" inputMode="decimal" className="campo" placeholder="0" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="rotulo" htmlFor="tipo_novo">Tipo</label>
                    <select id="tipo_novo" name="tipo_novo" defaultValue="comum" className="campo">
                      {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                    </select>
                  </div>
                </div>
                <fieldset className="mt-3">
                  <legend className="rotulo">Quais gastos saem deste envelope (cada categoria só pode ficar em um envelope)</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {CATS_ENV.map((cat) => (
                      <label key={cat} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="cats_novo" value={cat} className="h-4 w-4 accent-ciano" />
                        {cat}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="mt-2 text-xs text-mute">Para usar, desmarque a categoria no envelope em que ela está hoje e marque aqui. Depois clique em Salvar assessor.</p>
              </details>

              <p className={`text-sm ${Math.abs(somaPct - 100) > 0.01 ? "text-magenta" : "text-mute"}`}>
                Soma atual: {somaPct.toLocaleString("pt-BR")}%{Math.abs(somaPct - 100) > 0.01 ? " · precisa fechar 100%" : ""}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="rotulo" htmlFor="das_mensal">Imposto DAS mensal (R$) · 0 = desligado</label>
                  <input id="das_mensal" name="das_mensal" defaultValue={fmt(c.das_mensal)} inputMode="decimal" className="campo" />
                </div>
                <div>
                  <label className="rotulo" htmlFor="assessor_inicio">Começar a contar em</label>
                  <input id="assessor_inicio" name="assessor_inicio" type="date" defaultValue={c.assessor_inicio} className="campo" />
                </div>
                <div className="flex items-end gap-2">
                  <Enviar>Salvar assessor</Enviar>
                  <BotaoConfirmar
                    formAction={restaurarSugestaoAssessor}
                    texto="Voltar à sugestão (Material 30%, Tráfego 20%, Pró-labore 30%, Caixa 20%)? Os envelopes de hoje serão substituídos. Seus gastos continuam salvos."
                    className="botao2 text-xs"
                    type="submit"
                  >Voltar à sugestão</BotaoConfirmar>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-sm text-mute">Não foi possível carregar os envelopes agora. Tente de novo em instantes.</p>
          )}
        </section>

        <section className="painel p-5">
          <h2 className="titulo mb-4">Calculadora de revenda</h2>
          <Calculadora markup={c.markup_revenda} />
        </section>

      </div>
    </>
  );
}
