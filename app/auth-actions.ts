"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

const txt = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const erro = (rota: string, m: string): never => redirect(`${rota}?erro=${encodeURIComponent(m)}`);

export async function entrar(fd: FormData) {
  const { error } = await db().auth.signInWithPassword({ email: txt(fd.get("email")), password: String(fd.get("senha") ?? "") });
  if (error) erro("/login", "E-mail ou senha incorretos.");
  redirect("/");
}

export async function cadastrar(fd: FormData) {
  const senha = String(fd.get("senha") ?? "");
  if (senha.length < 8) erro("/cadastro", "A senha precisa ter pelo menos 8 caracteres.");
  if (senha !== String(fd.get("senha2") ?? "")) erro("/cadastro", "As senhas não conferem.");
  const { data, error } = await db().auth.signUp({ email: txt(fd.get("email")), password: senha });
  if (error) erro("/cadastro", "Não foi possível criar a conta. Confira o e-mail e tente de novo.");
  // Com confirmação de e-mail ligada no Supabase, ainda não há sessão: avisa pra confirmar.
  if (!data?.session) redirect("/login?ok=" + encodeURIComponent("Conta criada! Confirme seu e-mail e depois entre."));
  redirect("/onboarding");
}

export async function sair() {
  await db().auth.signOut();
  redirect("/login");
}

export async function criarEmpresa(fd: FormData) {
  const nome = txt(fd.get("nome"));
  if (!nome) erro("/onboarding", "Informe o nome da empresa.");
  const { error } = await db().rpc("criar_empresa", { p_nome: nome });
  if (error) erro("/onboarding", "Não foi possível criar a empresa.");
  redirect("/config");
}
