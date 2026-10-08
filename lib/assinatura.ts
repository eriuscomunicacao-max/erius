import "server-only";
import { cache } from "react";
import { db } from "./supabase";
import type { Assinatura } from "./assinatura-regras";

/** Assinatura da empresa do usuário logado (o RLS só devolve a dele). */
export const getAssinatura = cache(async (): Promise<Assinatura | null> => {
  const { data } = await db().from("assinaturas").select("*").maybeSingle();
  return (data as Assinatura) ?? null;
});

export const precoDoPlano = () => {
  const v = Number(String(process.env.PLANO_VALOR ?? "49.90").replace(",", "."));
  return isFinite(v) && v > 0 ? v : 49.9;
};
