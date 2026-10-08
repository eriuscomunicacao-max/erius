import Cabecalho from "@/components/Cabecalho";
import NovoOrcamento from "@/components/NovoOrcamento";
import ListaOrcamentos from "@/components/ListaOrcamentos";
import { carregarOrcamentos, carregarPrecos } from "@/lib/data";
import { hoje } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Orcamentos() {
  const [orcamentos, precos] = await Promise.all([carregarOrcamentos(), carregarPrecos()]);
  const pendentes = orcamentos.filter((o) => o.status === "pendente");
  const outros = orcamentos.filter((o) => o.status !== "pendente");

  return (
    <>
      <Cabecalho titulo="Orçamentos" sub="Monte, exporte em PDF e aprove — o aprovado vira OS" />
      <div className="space-y-4 p-4 lg:p-5">
        <section className="painel p-5">
          <h2 className="titulo mb-4">Novo orçamento</h2>
          <NovoOrcamento precos={precos} />
        </section>

        <section className="painel p-5">
          <h2 className="titulo mb-4">Pendentes</h2>
          <ListaOrcamentos orcamentos={pendentes} hoje={hoje()} />
        </section>

        {outros.length > 0 && (
          <details className="painel p-5">
            <summary className="titulo cursor-pointer">Histórico (aprovados e recusados)</summary>
            <div className="mt-4">
              <ListaOrcamentos orcamentos={outros} hoje={hoje()} />
            </div>
          </details>
        )}
      </div>
    </>
  );
}
