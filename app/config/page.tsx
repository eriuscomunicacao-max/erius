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
import { salvarConfig, criarFixa, alternarFixa, excluirFixa, salvarAssessor, atualizarFixa } from "../actions";
import Editar, { Campo } from "@/components/Editar";
import { paraCampo } from "@/lib/format";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Config() {
  const [b, envelopes, emp, padroes] = await Promise.all([carregar(), carregarEnvelopes(), getEmpresa(), carregarPadroes()]);
  const somaPct = (envelopes ?? []).reduce((t, e) => t + e.pct, 0);
  const c = b.config;
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");

  return (
    <>
      <Cabecalho titulo="Configurações" sub="Empresa, caixa, padrões do orçamento e despesas fixas" />
      <div className="space-y-4 p-4 lg:p-5">
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

        <section className="painel p-5">
          <h2 className="titulo mb-1">Meu Assessor</h2>
          <p className="mb-4 text-xs text-mute">Quanto de cada real recebido vai para cada envelope.</p>
          {envelopes ? (
            <form action={salvarAssessor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {envelopes.map((e) => (
                  <div key={e.id}>
                    <input type="hidden" name="env_id" value={e.id} />
                    <label className="rotulo" htmlFor={`pct_${e.id}`}>{e.nome} (%)</label>
                    <input id={`pct_${e.id}`} name={`pct_${e.id}`} defaultValue={fmt(e.pct)} inputMode="decimal" className="campo" />
                    <div className="mt-1 text-[11px] text-mute">sai de "{e.categoria}"</div>
                  </div>
                ))}
              </div>
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
                <div className="flex items-end"><Enviar>Salvar assessor</Enviar></div>
              </div>
            </form>
          ) : (
            <p className="text-sm text-mute">Rode o arquivo supabase/assessor.sql no Supabase para ativar.</p>
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
