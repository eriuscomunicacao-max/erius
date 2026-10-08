"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

const TOKEN = /^[0-9a-f]{32,128}$/;

export async function aceitarConvite(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  if (!TOKEN.test(token)) redirect("/login");
  const { error } = await db().rpc("aceitar_convite", { p_token: token });
  if (error) {
    const m = error.message ?? "";
    const msg = m.includes("já pertence") ? "Esta conta já pertence a uma empresa. Use outro e-mail para entrar como funcionário."
      : m.includes("vaga") ? "A empresa não tem vaga disponível. Peça ao responsável para liberar uma vaga."
      : "Convite inválido ou expirado. Peça um novo ao responsável.";
    redirect(`/convite/${token}?erro=${encodeURIComponent(msg)}`);
  }
  redirect("/producao");
}
