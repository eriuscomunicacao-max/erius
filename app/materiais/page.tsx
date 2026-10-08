import Cabecalho from "@/components/Cabecalho";
import Excluir from "@/components/Excluir";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import Editar, { Campo } from "@/components/Editar";
import { Valor } from "@/components/Privacidade";
import { db } from "@/lib/supabase";
import { brl, paraCampo } from "@/lib/format";
import { criarMaterial, atualizarMaterial, excluirMaterial } from "../empresa-actions";

export const dynamic = "force-dynamic";

const UNIDADES = ["un", "m", "m²", "folha", "milheiro", "kg", "l", "rolo", "caixa"] as const;

type Material = {
  id: string; nome: string; unidade: string; custo_unitario: number; fornecedor: string | null;
  estoque: number | null; observacoes: string | null;
};

export default async function Materiais() {
  const { data } = await db().from("materiais").select("*").order("nome");
  const lista = ((data ?? []) as Material[]).map((m) => ({ ...m, custo_unitario: Number(m.custo_unitario), estoque: m.estoque == null ? null : Number(m.estoque) }));

  return (
    <>
      <Cabecalho titulo="Materiais" sub="Papéis, vinis, lonas, chapas, tintas e o que mais você usa" />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="painel p-5">
          <h2 className="titulo mb-3">Novo material</h2>
          <FormReset action={criarMaterial} className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <div className="col-span-2">
              <label className="rotulo" htmlFor="nome">Nome</label>
              <input id="nome" name="nome" required className="campo" placeholder="Ex: Vinil adesivo branco 1,27m" />
            </div>
            <div>
              <label className="rotulo" htmlFor="unidade">Unidade</label>
              <select id="unidade" name="unidade" className="campo">{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select>
            </div>
            <div>
              <label className="rotulo" htmlFor="custo_unitario">Custo por unidade (R$)</label>
              <input id="custo_unitario" name="custo_unitario" inputMode="decimal" className="campo" placeholder="0,00" />
            </div>
            <div>
              <label className="rotulo" htmlFor="fornecedor">Fornecedor</label>
              <input id="fornecedor" name="fornecedor" className="campo" />
            </div>
            <div>
              <label className="rotulo" htmlFor="estoque">Estoque (opcional)</label>
              <input id="estoque" name="estoque" inputMode="decimal" className="campo" />
            </div>
            <div className="col-span-2 md:col-span-6"><Enviar>Adicionar material</Enviar></div>
          </FormReset>
        </section>

        <section className="painel overflow-x-auto p-5">
          <h2 className="titulo mb-3">Seus materiais</h2>
          {lista.length === 0 ? (
            <p className="text-sm text-mute">Nenhum material cadastrado ainda.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr><th>Material</th><th>Unidade</th><th className="text-right">Custo</th><th>Fornecedor</th><th className="text-right">Estoque</th><th /></tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nome}</td>
                    <td>{m.unidade}</td>
                    <td className="text-right"><Valor><Valor>{brl(m.custo_unitario)}</Valor></Valor></td>
                    <td>{m.fornecedor ?? "—"}</td>
                    <td className="text-right">{m.estoque ?? "—"}</td>
                    <td className="w-16">
                      <div className="flex items-center justify-end">
                        <Editar titulo="Editar material" action={atualizarMaterial}>
                          <input type="hidden" name="id" value={m.id} />
                          <Campo nome="nome" rotulo="Nome" valor={m.nome} largo />
                          <Campo nome="unidade" rotulo="Unidade" valor={m.unidade} opcoes={UNIDADES} />
                          <Campo nome="custo_unitario" rotulo="Custo por unidade (R$)" valor={paraCampo(m.custo_unitario)} decimal />
                          <Campo nome="fornecedor" rotulo="Fornecedor" valor={m.fornecedor} />
                          <Campo nome="estoque" rotulo="Estoque" valor={m.estoque} decimal />
                          <Campo nome="observacoes" rotulo="Observações" valor={m.observacoes} largo />
                        </Editar>
                        <Excluir action={excluirMaterial} id={m.id} texto="Excluir este material?" />
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
