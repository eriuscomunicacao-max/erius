import Link from "next/link";
import Enviar from "@/components/Enviar";
import { entrar } from "../auth-actions";

export default function Login({ searchParams }: { searchParams: { erro?: string; ok?: string; convite?: string } }) {
  const conv = /^[0-9a-f]{32,128}$/.test(searchParams.convite ?? "") ? searchParams.convite : "";
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-3xl font-bold">OrçaGrafica</h1>
      <p className="mb-6 mt-1 text-mute">Entre na sua conta.</p>
      {searchParams.erro && <p className="mb-3 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
      {searchParams.ok && <p className="mb-3 rounded-lg border border-ciano/40 p-3 text-sm text-ciano">{searchParams.ok}</p>}
      <form action={entrar} className="painel space-y-3 p-5">
        {conv && <input type="hidden" name="convite" value={conv} />}
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required autoComplete="current-password" className="campo" />
        </div>
        <Enviar>Entrar</Enviar>
      </form>
      <p className="mt-4 text-sm text-mute">
        Ainda não tem conta? <Link href={conv ? `/cadastro?convite=${conv}` : "/cadastro"} className="text-ciano underline">Criar conta</Link>
      </p>
    </div>
  );
}
