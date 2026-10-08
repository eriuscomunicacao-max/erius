import Cabecalho from "@/components/Cabecalho";
import NovoOrcamento from "@/components/NovoOrcamento";
import { carregarOrcamentos, carregarPrecos } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditarOrcamento({ params }: { params: { id: string } }) {
  const id = params.id;
  const [orcs, precos] = await Promise.all([carregarOrcamentos(), carregarPrecos()]);
  const o = orcs.find((x) => x.id === id);
  if (!o) notFound();
  return (
    <>
      <Cabecalho titulo={`Editar orçamento #${String(o.numero).padStart(4, "0")}`} sub={o.cliente} />
      <div className="p-4 lg:p-5">
        <section className="painel p-5">
          {o.status === "aprovado" && (
            <p className="mb-4 rounded-lg border border-amarelo/40 p-3 text-sm text-amarelo">
              Este orçamento já virou OS. Alterar aqui não muda a OS: pra mudar o serviço, edite a OS.
            </p>
          )}
          <NovoOrcamento precos={precos} inicial={o} />
        </section>
      </div>
    </>
  );
}
