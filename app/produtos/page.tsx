import Cabecalho from "@/components/Cabecalho";
import Excluir from "@/components/Excluir";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import Editar, { Campo } from "@/components/Editar";
import { Valor } from "@/components/Privacidade";
import { carregarProdutos } from "@/lib/data";
import { SERVICOS } from "@/lib/constants";
import { UNIDADES, rotuloUnidade } from "@/lib/produtos";
import { brl, paraCampo } from "@/lib/format";
import { criarProduto, atualizarProduto, excluirProduto } from "../empresa-actions";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const lista = await carregarProdutos();

  return (
    <>
      <Cabecalho titulo="Produtos e serviços" sub="Cadastre o que sua empresa vende. Eles aparecem nos orçamentos e nas OS." />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="painel p-5">
          <h2 className="titulo mb-3">Novo produto ou serviço</h2>
          <FormReset action={criarProduto} className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <div className="col-span-2">
              <label className="rotulo" htmlFor="nome">Nome</label>
              <input id="nome" name="nome" required className="campo" placeholder="Ex: Cartão de visita 4x4, Banner 440g, Adesivação" />
            </div>
            <div>
              <label className="rotulo" htmlFor="categoria">Categoria</label>
              <input id="categoria" name="categoria" list="categorias" className="campo" placeholder="Ex: Impressão" />
              <datalist id="categorias">{SERVICOS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className="rotulo" htmlFor="unidade">Cobrado por</label>
              <select id="unidade" name="unidade" className="campo">{UNIDADES.map((u) => <option key={u} value={u}>{rotuloUnidade(u)}</option>)}</select>
            </div>
            <div>
              <label className="rotulo" htmlFor="preco">Preço (R$)</label>
              <input id="preco" name="preco" required inputMode="decimal" className="campo" placeholder="0,00" />
            </div>
            <div>
              <label className="rotulo" htmlFor="descricao">Descrição (opcional)</label>
              <input id="descricao" name="descricao" className="campo" />
            </div>
            <div className="col-span-2 md:col-span-6"><Enviar>Adicionar</Enviar></div>
          </FormReset>
          <p className="mt-2 text-xs text-mute">
            Dica: em &quot;por m²&quot; o orçamento pede largura e altura; em &quot;por milheiro&quot; o preço é de cada 1.000 unidades.
          </p>
        </section>

        <section className="painel overflow-x-auto p-5">
          <h2 className="titulo mb-3">Seu catálogo</h2>
          {lista.length === 0 ? (
            <p className="text-sm text-mute">Nenhum produto cadastrado ainda. Comece adicionando acima.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr><th>Produto / serviço</th><th>Categoria</th><th>Cobrado</th><th className="text-right">Preço</th><th /></tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}{p.descricao && <div className="text-xs text-mute">{p.descricao}</div>}</td>
                    <td>{p.categoria}</td>
                    <td>{rotuloUnidade(p.unidade)}</td>
                    <td className="text-right"><Valor>{brl(p.preco)}</Valor></td>
                    <td className="w-16">
                      <div className="flex items-center justify-end">
                        <Editar titulo="Editar produto" action={atualizarProduto}>
                          <input type="hidden" name="id" value={p.id} />
                          <Campo nome="nome" rotulo="Nome" valor={p.nome} largo />
                          <Campo nome="categoria" rotulo="Categoria" valor={p.categoria} />
                          <Campo nome="unidade" rotulo="Cobrado por" valor={p.unidade} opcoes={UNIDADES} />
                          <Campo nome="preco" rotulo="Preço (R$)" valor={paraCampo(p.preco)} decimal />
                          <Campo nome="descricao" rotulo="Descrição" valor={p.descricao} />
                        </Editar>
                        <Excluir action={excluirProduto} id={p.id} texto="Excluir este produto? Orçamentos já feitos não mudam." />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
