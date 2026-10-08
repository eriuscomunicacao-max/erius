import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Client do Supabase com a SESSÃO do usuário logado (chave anon).
 * O RLS do banco garante que cada empresa só enxerga os próprios dados.
 * Nunca usar service_role aqui.
 */
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const store = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista: { name: string; value: string; options: CookieOptions }[]) => {
        try { lista.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* chamado em Server Component: o middleware renova a sessão */ }
      },
    },
  });
}
