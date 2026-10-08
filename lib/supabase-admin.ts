import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client com service_role: IGNORA o RLS. Use SOMENTE no servidor, para o que o usuário
 * não pode fazer sozinho (webhook da Asaas, gravar ids de assinatura). Nunca no navegador.
 */
export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente (somente servidor).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
