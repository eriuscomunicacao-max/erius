import Cabecalho from "@/components/Cabecalho";
import NovaOS from "@/components/NovaOS";
import { carregar, carregarOS, pagoPorPedido } from "@/lib/data";
import { hoje } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditarOS({ params }: { params: { id: string } }) {
  const id = params.id;
  const [b, ordens] = await Promise.all([carregar(), carregarOS()]);
  const o = ordens.find((x) => x.id === id);
  if (!o) notFound();
  const pago = o.pedido_id ? pagoPorPedido(b.pagamentos).get(o.pedido_id) ?? 0 : 0;
  const nomes = [...new Set(b.pedidos.map((p) => p.cliente))].sort();
  return (
    <>
      <Cabecalho titulo={`Editar OS #${String(o.numero).padStart(4, "0")}`} sub={o.cliente} />
      <div className="p-4 lg:p-5">
        <section className="painel p-5">
          <NovaOS hoje={hoje()} nomes={nomes} inicial={o} pagoAtual={pago} />
        </section>
      </div>
    </>
  );
}
