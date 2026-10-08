import "server-only";
import { cache } from "react";
import { db } from "./supabase";

export type Papel = "dono" | "equipe" | null;

/** Papel do usuário logado: dono (tudo) ou equipe (só produção). */
export const meuPapel = cache(async (): Promise<Papel> => {
  const { data } = await db().rpc("meu_papel");
  return data === "dono" || data === "equipe" ? data : null;
});
