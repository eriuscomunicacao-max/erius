import Cabecalho from "@/components/Cabecalho";
import Excluir from "@/components/Excluir";
import Editar, { Campo } from "@/components/Editar";
import { paraCampo } from "@/lib/format";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import { carregar } from "@/lib/data";
import { brl, dataBR, hoje, mesAtual, mesDe, mesLongo, pct } from "@/lib/format";
import { CATEGORIAS_GASTO, LIMITES } from "@/lib/constants";
import { criarGasto, excluirGasto, lancarFixas, atualizarGasto } from "../actions";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Gastos({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const b = await carregar();
  const lista = b.gastos.filter((g) => mesDe(g.data) === mes);
  const total = lista.reduce((s, g) => s + g.valor, 0);
  const porCat = CATEGORIAS_GASTO.map((c) => {
    const v = lista.filter((g) => g.categoria === c).reduce((s, g) => s + g.valor, 0);
    const p = total ? v / total : 0;
    const l = LIMITES[c];
    const st: "ok" | "alerta" | "ruim" = !v ? "ok" : p >= l.vermelho ? "ruim" : p >= l.amarelo ? "alerta" : "ok";
    return { c, v, p, st };
  });
  const cor = { ok: "text-verde", alerta: "text-amarelo", ruim: "text-vermelho" } as const;
  const rot = { ok: "OK", alerta: "Atenção", ruim: "Alto" } as const;

  return (
    <>
      <Cabecalho titulo="Gastos" sub={`Despesas de ${mesLongo(mes)}`} mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="painel p-5">
            <h2 className="titulo mb-1">Novo gasto</h2>
            <p className="mb-4 text-xs text-mute">Compra parcelada: lance só o valor da parcela do mês e informe a parcela (ex: 2/10).</p>
            <FormReset action={criarGasto} className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="col-span-2 md:col-span-3">
                <label className="rotulo" htmlFor="descricao">Descrição</label>
                <input id="descricao" name="descricao" required className="campo" placeholder="Ex: Rolo de vinil 60cm x 50m" />
              </div>
              <div>
                <label className="rotulo" htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" className="campo">{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <div>
                <label className="rotulo" htmlFor="valor">Valor (R$)</label>
                <input id="valor" name="valor" required inputMode="decimal" className="campo" placeholder="362,80" />
              </div>
              <div>
                <label className="rotulo" htmlFor="data">Data</label>
                <input id="data" name="data" type="date" defaultValue={hoje()} className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="parcela">Parcela</label>
                <input id="parcela" name="parcela" className="campo" placeholder="1/84 (opcional)" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="rotulo" htmlFor="observacoes">Observações</label>
                <input id="observacoes" name="observacoes" className="campo" />
              </div>
              <div className="col-span-2 flex items-end md:col-span-1"><Enviar>Salvar gasto</Enviar></div>
            </FormReset>
          </section>

          <section className="painel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="titulo">Por categoria</h2>
              <span className="font-display font-semibold"><Valor>{brl(total)}</Valor></span>
            </div>
            <table className="tabela">
              <tbody>
                {porCat.map((x) => (
                  <tr key={x.c}>
                    <td className="px-0">{x.c}</td>
                    <td className="text-right"><Valor>{brl(x.v)}</Valor></td>
                    <td className="text-right text-mute">{pct(x.p, 0)}</td>
                    <td className={`px-0 text-right text-xs ${cor[x.st]}`}>{rot[x.st]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form action={lancarFixas} className="mt-4">
              <input type="hidden" name="mes" value={mes} />
              <Enviar className="botao2 w-full">Lançar despesas fixas deste mês</Enviar>
              <p className="mt-1.5 text-xs text-mute">Só lança as que ainda não foram lançadas no mês.</p>
            </form>
          </section>
        </div>

        <section className="painel overflow-x-auto p-5">
          <h2 className="titulo mb-3">Lançamentos</h2>
          {lista.length === 0 ? (
            <p className="text-sm text-mute">Nenhum gasto neste mês.</p>
          ) : (
            <table className="tabela min-w-[720px]">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Parcela</th><th className="text-right">Valor</th><th /></tr></thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap text-mute">{dataBR(g.data)}</td>
                    <td>{g.descricao}{g.observacoes && <div className="text-xs text-mute">{g.observacoes}</div>}</td>
                    <td>{g.categoria}</td>
                    <td className="text-mute">{g.parcela_atual ? `${g.parcela_atual}/${g.parcela_total}` : "À vista"}</td>
                    <td className="text-right"><Valor>{brl(g.valor)}</Valor></td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <Editar titulo="Editar gasto" action={atualizarGasto}>
                          <input type="hidden" name="id" value={g.id} />
                          <Campo nome="descricao" rotulo="Descrição" valor={g.descricao} largo />
                          <Campo nome="categoria" rotulo="Categoria" valor={g.categoria} opcoes={CATEGORIAS_GASTO} />
                          <Campo nome="valor" rotulo="Valor (R$)" valor={paraCampo(g.valor)} decimal />
                          <Campo nome="data" rotulo="Data" valor={g.data} tipo="date" />
                          <Campo nome="parcela" rotulo="Parcela (ex: 2/10)" valor={g.parcela_atual ? `${g.parcela_atual}/${g.parcela_total}` : ""} />
                          <Campo nome="observacoes" rotulo="Observações" valor={g.observacoes} largo />
                        </Editar>
                        <Excluir action={excluirGasto} id={g.id} />
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
