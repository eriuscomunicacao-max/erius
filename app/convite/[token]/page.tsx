import Link from "next/link";
import Enviar from "@/components/Enviar";
import { db } from "@/lib/supabase";
import { aceitarConvite } from "../../convite-actions";

export const dynamic = "force-dynamic";
const TOKEN = /^[0-9a-f]{32,128}$/;

export default async function Convite({ params, searchParams }: { params: { token: string }; searchParams: { erro?: string } }) {
  const token = params.token;
  const s = db();
  const nome = TOKEN.test(token) ? ((await s.rpc("convite_info", { p_token: token })).data as string | null) : null;
  const { data: { user } } = await s.auth.getUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-3xl font-bold">OrçaGrafica</h1>
      {!nome ? (
        <p className="mt-4 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">
          {searchParams.erro ?? "Convite inválido ou expirado. Peça um novo ao responsável da empresa."}
        </p>
      ) : (
        <>
          <p className="mb-6 mt-1 text-mute">Você foi convidado para a equipe da <b className="text-ink">{nome}</b>.</p>
          {searchParams.erro && <p className="mb-3 rounded-lg border border-magenta/40 p-3 text-sm text-magenta" role="alert">{searchParams.erro}</p>}
          {user ? (
            <form action={aceitarConvite} className="painel space-y-3 p-5">
              <input type="hidden" name="token" value={token} />
              <p className="text-sm text-ink">Entrando como <b>{user.email}</b>. Você terá acesso às ordens de serviço em produção.</p>
              <Enviar>Entrar na equipe</Enviar>
            </form>
          ) : (
            <div className="painel space-y-3 p-5">
              <p className="text-sm text-ink">Crie sua conta ou entre para aceitar o convite.</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/cadastro?convite=${token}`} className="botao">Criar conta</Link>
                <Link href={`/login?convite=${token}`} className="botao2">Já tenho conta</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
