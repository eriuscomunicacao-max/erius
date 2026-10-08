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
  // Sem teste ativo nem pagamento → só a tela de assinatura (null = ainda sem empresa → segue pro onboarding)
  if (user && !publica && path !== "/onboarding" && !path.startsWith("/assinatura")) {
    const { data: liberado } = await supabase.rpc("acesso_liberado");
    if (liberado === false) {
      const url = req.nextUrl.clone();
      url.pathname = "/assinatura";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
