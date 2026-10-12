import "server-only";
import { cache } from "react";
import { db } from "./supabase";

export type Contexto = {
  papel: "dono" | "equipe" | null;
  liberado: boolean | null;
  ativado: boolean | null; // já usa o sistema (criou OS/orçamento, paga ou tem acesso livre)
};

/** Papel, acesso e "ativação" do usuário logado, numa chamada só ao banco. */
export const getContexto = cache(async (): Promise<Contexto> => {
  const { data } = await db().rpc("contexto_acesso");
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    papel: d.papel === "dono" || d.papel === "equipe" ? d.papel : null,
    liberado: typeof d.liberado === "boolean" ? d.liberado : null,
    ativado: typeof d.ativado === "boolean" ? d.ativado : null,
  };
});
