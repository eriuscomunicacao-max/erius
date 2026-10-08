import Cabecalho from "@/components/Cabecalho";
import Excluir from "@/components/Excluir";
import Editar, { Campo } from "@/components/Editar";
import { paraCampo } from "@/lib/format";
import Enviar from "@/components/Enviar";
import FormReset from "@/components/FormReset";
import PainelCobranca from "@/components/PainelCobranca";
import { carregar, pagoPorPedido, statusPedido } from "@/lib/data";
import { brl, dataBR, hoje, mesAtual, mesDe, mesLongo, num } from "@/lib/format";
import { SERVICOS, FORMAS } from "@/lib/constants";
import { criarPedido, registrarPagamento, excluirPedido, excluirPagamento, atualizarPedido, atualizarPagamento } from "../actions";
import { Valor } from "@/components/Privacidade";

export const dynamic = "force-dynamic";

const corStatus: Record<string, string> = {
  Pago: "bg-verde/15 text-verde",
  Parcial: "bg-amarelo/15 text-amarelo",
  "Não pago": "bg-vermelho/15 text-vermelho",
};

export default async function Clientes({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : mesAtual();
  const b = await carregar();
  const pagos = pagoPorPedido(b.pagamentos);
  const doMes = b.pedidos.filter((p) => mesDe(p.data) === mes);
  const abertos = b.pedidos.filter((p) => p.valor_total - (pagos.get(p.id) ?? 0) > 0.005);
  const nomes = [...new Set(b.pedidos.map((p) => p.cliente))].sort();

  // primeira compra de cada cliente (por nome, no histórico inteiro) → marca "Novo"
  const primeiraCompra = new Map<string, string>();
  [...b.pedidos].sort((a, c) => a.data.localeCompare(c.data) || a.id.localeCompare(c.id)).forEach((p) => {
    const chave = p.cliente.trim().toLowerCase();
    if (!primeiraCompra.has(chave)) primeiraCompra.set(chave, p.id);
  });
  const itensCobranca = abertos
    .map((p) => ({
      pedido: p,
      pago: pagos.get(p.id) ?? 0,
      saldo: p.valor_total - (pagos.get(p.id) ?? 0),
      novo: primeiraCompra.get(p.cliente.trim().toLowerCase()) === p.id,
    }))
    .sort((a, c) => c.saldo - a.saldo);

  return (
    <>
      <Cabecalho titulo="Clientes e Pedidos" sub={`Pedidos de ${mesLongo(mes)}`} mes={mes} />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="painel p-5">
          <h2 className="titulo mb-4">Novo pedido</h2>
          <FormReset action={criarPedido} className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div className="col-span-2">
              <label className="rotulo" htmlFor="cliente">Cliente</label>
              <input id="cliente" name="cliente" list="lista-clientes" required className="campo" placeholder="Nome do cliente" />
              <datalist id="lista-clientes">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div>
              <label className="rotulo" htmlFor="servico">Serviço</label>
              <select id="servico" name="servico" className="campo">{SERVICOS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="col-span-2 md:col-span-1 xl:col-span-2">
              <label className="rotulo" htmlFor="descricao">Descrição</label>
              <input id="descricao" name="descricao" className="campo" placeholder="Ex: 5x5 fosco" />
            </div>
            <div>
              <label className="rotulo" htmlFor="quantidade">Quantidade</label>
              <input id="quantidade" name="quantidade" inputMode="numeric" className="campo" placeholder="500" />
            </div>
            <div>
              <label className="rotulo" htmlFor="data">Data</label>
              <input id="data" name="data" type="date" defaultValue={hoje()} className="campo" />
            </div>
            <div>
              <label className="rotulo" htmlFor="valor_base">Valor (R$)</label>
              <input id="valor_base" name="valor_base" inputMode="decimal" required className="campo" placeholder="190,00" />
            </div>
            <div>
              <label className="rotulo" htmlFor="valor_pago">Já recebeu (R$)</label>
              <input id="valor_pago" name="valor_pago" inputMode="decimal" className="campo" placeholder="Sinal, se houver" />
            </div>
            <div>
              <label className="rotulo" htmlFor="forma_pagto">Pagamento</label>
              <select id="forma_pagto" name="forma_pagto" className="campo">{FORMAS.map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" name="prioridade" className="h-4 w-4 accent-verde" /> Prioridade 48h (+<Valor>{brl(b.config.adicional_prioridade)}</Valor>)
            </label>
            <div className="col-span-2 md:col-span-3 xl:col-span-4">
              <label className="rotulo" htmlFor="observacoes">Observações</label>
              <input id="observacoes" name="observacoes" className="campo" />
            </div>
            <div className="col-span-2 flex items-end md:col-span-1 xl:col-span-2"><Enviar>Salvar pedido</Enviar></div>
          </FormReset>
        </section>

        <div>
          <h2 className="titulo mb-3">Quem falta pagar</h2>
          <PainelCobranca itens={itensCobranca} />
        </div>

        <details className="painel overflow-x-auto p-5">
          <summary className="titulo cursor-pointer">
            Ver todos os pedidos do mês <span className="text-sm font-normal text-mute">({doMes.length} pedidos · <Valor>{brl(doMes.reduce((s, p) => s + p.valor_total, 0))}</Valor>)</span>
          </summary>
          <div className="mt-4">
            <TabelaPedidos lista={doMes} pagos={pagos} b={b} />
          </div>
        </details>
      </div>
    </>
  );
}

function TabelaPedidos({ lista, pagos, b }: { lista: Awaited<ReturnType<typeof carregar>>["pedidos"]; pagos: Map<string, number>; b: Awaited<ReturnType<typeof carregar>> }) {
  if (!lista.length) return <p className="text-sm text-mute">Nada por aqui.</p>;
  return (
    <table className="tabela min-w-[980px]">
      <thead>
        <tr>
          <th>Data</th><th>Cliente</th><th>Serviço</th><th className="text-right">Qtd</th>
          <th className="text-right">Total</th><th className="text-right">Pago</th><th className="text-right">Saldo</th>
          <th>Status</th><th className="w-[280px]">Receber</th><th />
        </tr>
      </thead>
      <tbody>
        {lista.map((p) => {
          const pago = pagos.get(p.id) ?? 0;
          const saldo = p.valor_total - pago;
          const st = statusPedido(p.valor_total, pago);
          const pgs = b.pagamentos.filter((x) => x.pedido_id === p.id);
          return (
            <tr key={p.id}>
              <td className="whitespace-nowrap text-mute">{dataBR(p.data)}</td>
              <td>
                <div className="font-medium">{p.cliente}</div>
                {p.observacoes && <div className="text-xs text-mute">{p.observacoes}</div>}
              </td>
              <td>
                {p.servico}
                {p.descricao && <span className="text-mute"> · {p.descricao}</span>}
                {p.prioridade && <span className="ml-2 rounded bg-roxo/20 px-1.5 py-0.5 text-[11px] text-roxo">48h</span>}
              </td>
              <td className="text-right">{num(p.quantidade)}</td>
              <td className="text-right"><Valor>{brl(p.valor_total)}</Valor></td>
              <td className="text-right">
                <Valor>{brl(pago)}</Valor>
                {pgs.length > 0 && (
                  <details className="text-left text-xs text-mute">
                    <summary className="cursor-pointer text-right">{pgs.length} pgto</summary>
                    {pgs.map((x) => (
                      <div key={x.id} className="flex items-center justify-end gap-1">
                        {dataBR(x.data)} <Valor>{brl(x.valor)}</Valor>
                        <Editar titulo="Editar pagamento" action={atualizarPagamento}>
                          <input type="hidden" name="id" value={x.id} />
                          <Campo nome="valor" rotulo="Valor (R$)" valor={paraCampo(x.valor)} decimal />
                          <Campo nome="data" rotulo="Data" valor={x.data} tipo="date" />
                          <Campo nome="forma" rotulo="Forma" valor={x.forma ?? "Pix"} opcoes={FORMAS} />
                        </Editar>
                        <Excluir action={excluirPagamento} id={x.id} texto="Excluir este pagamento?" />
                      </div>
                    ))}
                  </details>
                )}
              </td>
              <td className={`text-right ${saldo > 0.005 ? "text-amarelo" : "text-mute"}`}><Valor>{brl(Math.max(0, saldo))}</Valor></td>
              <td><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${corStatus[st]}`}>{st}</span></td>
              <td>
                {saldo > 0.005 ? (
                  <form action={registrarPagamento} className="flex gap-1.5">
                    <input type="hidden" name="pedido_id" value={p.id} />
                    <input name="valor" defaultValue={saldo.toFixed(2).replace(".", ",")} inputMode="decimal" className="campo w-24 py-1" aria-label="Valor recebido" />
                    <input name="data" type="date" defaultValue={hoje()} className="campo w-[130px] py-1" aria-label="Data" />
                    <Enviar className="botao2">Receber</Enviar>
                  </form>
                ) : (
                  <span className="text-xs text-mute">Quitado</span>
                )}
              </td>
              <td>
                <div className="flex items-center">
                  <Editar titulo="Editar pedido" action={atualizarPedido}>
                    <input type="hidden" name="id" value={p.id} />
                    {p.descricao?.startsWith("OS #") && (
                      <p className="col-span-2 text-xs text-amarelo">Este pedido veio de uma OS. Prefira editar pela aba Ordens de Serviço, pra OS e pedido ficarem iguais.</p>
                    )}
                    <Campo nome="cliente" rotulo="Cliente" valor={p.cliente} largo />
                    <Campo nome="servico" rotulo="Serviço" valor={p.servico} opcoes={SERVICOS} />
                    <Campo nome="quantidade" rotulo="Quantidade" valor={p.quantidade} />
                    <Campo nome="descricao" rotulo="Descrição" valor={p.descricao} largo />
                    <Campo nome="valor_base" rotulo="Valor (R$)" valor={paraCampo(p.valor_base)} decimal />
                    <Campo nome="data" rotulo="Data" valor={p.data} tipo="date" />
                    <Campo nome="forma_pagto" rotulo="Pagamento" valor={p.forma_pagto ?? "Pix"} opcoes={FORMAS} />
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <input type="checkbox" name="prioridade" defaultChecked={p.prioridade} className="h-4 w-4 accent-verde" /> Prioridade 48h
                    </label>
                    <Campo nome="observacoes" rotulo="Observações" valor={p.observacoes} largo />
                  </Editar>
                  <Excluir action={excluirPedido} id={p.id} texto={`Excluir o pedido de ${p.cliente}?`} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
