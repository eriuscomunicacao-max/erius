import Link from "next/link";
import { redirect } from "next/navigation";
import Enviar from "@/components/Enviar";
import { getEmpresa } from "@/lib/empresa";
import { getContexto } from "@/lib/contexto";
import { sair } from "../auth-actions";
import { salvarDadosIniciais } from "../comecar-actions";

export const dynamic = "force-dynamic";

export default async function Comecar({ searchParams }: { searchParams: { erro?: string } }) {
  const emp = await getEmpresa();
  const ctx = await getContexto();
  if (ctx.papel === "equipe") redirect("/producao");
  if (ctx.ativado) redirect("/"); // dados já preenchidos (ou já usa o sistema): sem barreira

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Complete os dados da sua empresa</h1>
      <p className="mt-1 text-mute">
        Leva 1 minuto. Esses dados aparecem nos seus orçamentos em PDF. Depois o sistema todo fica liberado.
      </p>

      {searchParams.erro && (
        <p className="mt-4 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>
      )}

      <form action={salvarDadosIniciais} className="painel mt-5 space-y-3 p-5">
        <div>
          <label className="rotulo" htmlFor="nome">Nome da empresa</label>
          <input id="nome" name="nome" required maxLength={80} defaultValue={emp.nome} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="cnpj">CPF ou CNPJ</label>
          <input id="cnpj" name="cnpj" required inputMode="numeric" defaultValue={emp.cnpj ?? ""} className="campo" placeholder="Só números" />
        </div>
        <div>
          <label className="rotulo" htmlFor="telefone">WhatsApp da empresa (com DDD)</label>
          <input id="telefone" name="telefone" required inputMode="tel" defaultValue={emp.telefone ?? ""} className="campo" placeholder="(19) 99999-9999" />
        </div>
        <div>
          <label className="rotulo" htmlFor="logo">Logo (PNG ou JPG, opcional)</label>
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" className="campo" />
        </div>
        <Enviar>Salvar e entrar no sistema</Enviar>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-mute">
        <Link href="/assinatura" className="underline">Quero assinar agora</Link>
        <form action={sair}><button className="underline">Sair da conta</button></form>
      </div>
    </div>
  );
}
