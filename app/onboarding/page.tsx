import { redirect } from "next/navigation";
import Enviar from "@/components/Enviar";
import { getEmpresaOuNull } from "@/lib/empresa";
import { criarEmpresa } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function Onboarding({ searchParams }: { searchParams: { erro?: string } }) {
  if (await getEmpresaOuNull()) redirect("/");
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-3xl font-bold">Quase lá</h1>
      <p className="mb-6 mt-1 text-mute">Como se chama a sua gráfica? Depois você completa logo, cores e dados em Configurações.</p>
      {searchParams.erro && <p className="mb-3 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
      <form action={criarEmpresa} className="painel space-y-3 p-5">
        <div>
          <label className="rotulo" htmlFor="nome">Nome da empresa</label>
          <input id="nome" name="nome" required maxLength={80} className="campo" />
        </div>
        <Enviar>Continuar</Enviar>
      </form>
    </div>
  );
}
