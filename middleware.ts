import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLICAS = ["/login", "/cadastro"];

export async function middleware(req: NextRequest) {
  // Webhook da Asaas: autenticado pelo próprio token (header), sem sessão de usuário
  if (req.nextUrl.pathname.startsWith("/api/asaas/")) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista: { name: string; value: string; options: CookieOptions }[]) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // getUser() valida o token no servidor do Supabase (não confia só no cookie)
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path === p || path.startsWith(p + "/"));
  const livre = path === "/convite" || path.startsWith("/convite/"); // convite funciona logado ou não

  if (livre) return res;
  if (path === "/lp") return res; // landing de vendas: pública, logado ou não
  // visitante sem login no endereço principal vê a landing (a URL continua "/")
  if (!user && path === "/") return NextResponse.rewrite(new URL("/lp", req.url));
  if (!user && !publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !publica && path !== "/onboarding") {
    // 1 chamada traz: acesso liberado? (true/false/null=sem empresa) e papel (dono/equipe)
    const { data: ctx } = await supabase.rpc("contexto_acesso");
    const liberado = (ctx as { liberado?: boolean | null } | null)?.liberado;
    const papel = (ctx as { papel?: string | null } | null)?.papel;
    const ir = (destino: string) => {
      const url = req.nextUrl.clone();
      url.pathname = destino;
      url.search = "";
      return NextResponse.redirect(url);
    };
    // Funcionário: só Produção (e a tela de aviso se o acesso da empresa estiver suspenso)
    if (papel === "equipe" && !path.startsWith("/producao") && !path.startsWith("/assinatura")) return ir("/producao");
    // Sem teste ativo nem pagamento → só a tela de assinatura
    if (liberado === false && !path.startsWith("/assinatura")) return ir("/assinatura");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
