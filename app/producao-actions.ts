"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

/** Funcionário (ou dono) move a OS entre aberta / em produção / pronta. */
export async function mudarStatusProducao(fd: FormData) {
  const { error } = await db().rpc("os_mudar_status", { p_id: String(fd.get("id")), p_status: String(fd.get("status")) });
  if (error) throw new Error(error.message);
  revalidatePath("/producao");
  revalidatePath("/os");
}
