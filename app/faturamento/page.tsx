import { NAO_DESPESA } from "@/lib/constants";
import Cabecalho from "@/components/Cabecalho";
import { Combinado } from "@/components/Graficos";
import { carregar } from "@/lib/data";
import { brl, mesAtual, mesDe, mesLongo, pct, somaMes, mesCurto } from "@/lib/format";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Faturamento() {
  const b = await carregar();
  const datas = [...b.pedidos.map((p) => p.data), ...b.gastos.map((g) => g.data)].sort();
  const fim = mesAtual();
  const ini = datas.length ? mesDe(datas[0]) : fim;
  const meses: string[] = [];
  for (let m = ini; m <= fim; m = somaMes(m, 1)) meses.push(m);

  const linhas = meses.map((m) => {
    const fat = b.pedidos.filter((p) => mesDe(p.data) === m).reduce((s, p) => s + p.valor_total, 0);
    const desp = b.gastos.filter((g) => mesDe(g.data) === m && !NAO_DESPESA.includes(g.categoria)).reduce((s, g) => s + g.valor, 0);
    const rec = b.pagamentos.filter((p) => mesDe(p.data) === m).reduce((s, p) => s + p.valor, 0);
    return { m, fat, desp, rec, lucro: fat - desp, margem: fat ? (fat - desp) / fat : 0 };
  });
  const tot = linhas.reduce((a, l) => ({ fat: a.fat + l.fat, desp: a.desp + l.desp, rec: a.rec + l.rec }), { fat: 0, desp: 0, rec: 0 });
  const serie = linhas.slice(-12).map((l) => ({ mes: mesCurto(l.m), faturamento: l.fat, despesas: l.desp, lucro: l.lucro, caixa: l.rec - l.desp }));

  return (
    <>
      <Cabecalho titulo="Faturamento e Lucro" sub="Resultado mês a mês" />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="painel p-5"><div className="text-sm text-mute">Faturamento total</div><div className="mt-2 font-display text-2xl font-bold"><Valor>{brl(tot.fat)}</Valor></div></div>
          <div className="painel p-5"><div className="text-sm text-mute">Gastos totais</div><div className="mt-2 font-display text-2xl font-bold"><Valor>{brl(tot.desp)}</Valor></div></div>
          <div className="painel p-5"><div className="text-sm text-mute">Lucro total</div><div className={`mt-2 font-display text-2xl font-bold ${tot.fat - tot.desp < 0 ? "text-vermelho" : "text-verde"}`}><Valor>{brl(tot.fat - tot.desp)}</Valor></div></div>
        </section>
        <section className="painel p-5">
          <h2 className="titulo mb-2">Evolução</h2>
          <Combinado dados={serie} />
        </section>
        <section className="painel overflow-x-auto p-5">
          <p className="mb-3 text-xs text-mute">Faturamento = valor dos pedidos do mês (inclui o que ainda não foi pago). Recebido = dinheiro que entrou no mês.</p>
          <table className="tabela min-w-[640px]">
            <thead><tr><th>Mês</th><th className="text-right">Faturamento</th><th className="text-right">Recebido</th><th className="text-right">Gastos</th><th className="text-right">Lucro</th><th className="text-right">Margem</th></tr></thead>
            <tbody>
              {linhas.slice().reverse().map((l) => (
                <tr key={l.m}>
                  <td className="capitalize">{mesLongo(l.m)}</td>
                  <td className="text-right"><Valor>{brl(l.fat)}</Valor></td>
                  <td className="text-right text-mute"><Valor>{brl(l.rec)}</Valor></td>
                  <td className="text-right"><Valor>{brl(l.desp)}</Valor></td>
                  <td className={`text-right ${l.lucro < 0 ? "text-vermelho" : "text-verde"}`}><Valor>{brl(l.lucro)}</Valor></td>
                  <td className="text-right">{pct(l.margem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
