import Cabecalho from "@/components/Cabecalho";
import { carregar } from "@/lib/data";
import { brl, dataBR, mesAtual, mesDe, mesLongo } from "@/lib/format";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

export default async function Fluxo({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const b = await carregar();
  const nomePedido = new Map(b.pedidos.map((p) => [p.id, `${p.cliente} · ${p.servico}`]));

  const movs = [
    ...b.pagamentos.map((p) => ({ data: p.data, desc: nomePedido.get(p.pedido_id) ?? "Recebimento", cat: `Recebimento ${p.forma ?? ""}`.trim(), valor: p.valor, ordem: `a${p.id}` })),
    ...b.gastos.map((g) => ({ data: g.data, desc: g.descricao, cat: g.categoria, valor: -g.valor, ordem: `b${g.id}` })),
  ].sort((a, c) => a.data.localeCompare(c.data) || a.ordem.localeCompare(c.ordem));

  let saldo = b.config.caixa_inicial;
  const comSaldo = movs.map((m) => ({ ...m, saldo: (saldo += m.valor) }));
  const doMes = comSaldo.filter((m) => mesDe(m.data) === mes);
  const anteriores = comSaldo.filter((m) => mesDe(m.data) < mes);
  const saldoIni = anteriores.length ? anteriores[anteriores.length - 1].saldo : b.config.caixa_inicial;
  const entradas = doMes.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0);
  const saidas = doMes.filter((m) => m.valor < 0).reduce((s, m) => s - m.valor, 0);

  return (
    <>
      <Cabecalho titulo="Fluxo de Caixa" sub={`Entradas e saídas de ${mesLongo(mes)}`} mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Box r="Caixa atual" v={brl(saldo)} c={saldo < 0 ? "text-vermelho" : "text-verde"} />
          <Box r="Saldo no início do mês" v={brl(saldoIni)} />
          <Box r="Entradas no mês" v={brl(entradas)} c="text-verde" />
          <Box r="Saídas no mês" v={brl(saidas)} c="text-azul" />
          <Box r="Resultado do mês" v={brl(entradas - saidas)} c={entradas - saidas < 0 ? "text-vermelho" : "text-verde"} />
        </section>
        <section className="painel overflow-x-auto p-5">
          <h2 className="titulo mb-1">Extrato</h2>
          <p className="mb-3 text-xs text-mute">Entradas vêm dos pagamentos registrados em Clientes; saídas, dos lançamentos em Gastos. Caixa inicial de <Valor>{brl(b.config.caixa_inicial)}</Valor> (ajuste em Configurações).</p>
          {doMes.length === 0 ? (
            <p className="text-sm text-mute">Nenhuma movimentação neste mês.</p>
          ) : (
            <table className="tabela min-w-[680px]">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="text-right">Valor</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {doMes.map((m, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap text-mute">{dataBR(m.data)}</td>
                    <td>{m.desc}</td>
                    <td className="text-mute">{m.cat}</td>
                    <td className={`text-right ${m.valor >= 0 ? "text-verde" : "text-ink"}`}>{m.valor >= 0 ? "+" : "−"} <Valor>{brl(Math.abs(m.valor))}</Valor></td>
                    <td className={`text-right ${m.saldo < 0 ? "text-vermelho" : ""}`}><Valor>{brl(m.saldo)}</Valor></td>
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

function Box({ r, v, c = "text-ink" }: { r: string; v: string; c?: string }) {
  return (
    <div className="painel p-5">
      <div className="text-sm text-mute">{r}</div>
      <div className={`mt-2 font-display text-2xl font-bold ${c}`}><Valor>{v}</Valor></div>
    </div>
  );
}
