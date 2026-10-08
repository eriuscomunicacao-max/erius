import Link from "next/link";
import Enviar from "@/components/Enviar";
import { cadastrar } from "../auth-actions";

export default function Cadastro({ searchParams }: { searchParams: { erro?: string } }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-3xl font-bold">Criar conta</h1>
      <p className="mb-6 mt-1 text-mute">Comece a organizar orçamentos, pedidos e financeiro da sua gráfica.</p>
      {searchParams.erro && <p className="mb-3 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
      <form action={cadastrar} className="painel space-y-3 p-5">
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha (mín. 8 caracteres)</label>
          <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha2">Repita a senha</label>
          <input id="senha2" name="senha2" type="password" required minLength={8} autoComplete="new-password" className="campo" />
        </div>
        <Enviar>Criar conta</Enviar>
      </form>
      <p className="mt-4 text-sm text-mute">
        Já tem conta? <Link href="/login" className="text-ciano underline">Entrar</Link>
      </p>
    </div>
  );
}
