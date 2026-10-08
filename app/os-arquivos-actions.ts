"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";

const MIMES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX = 10 * 1024 * 1024;

/** O arquivo já foi enviado direto do navegador pro Storage; aqui só conferimos e registramos. */
export async function registrarArquivo(p: { osId: string; path: string; nome: string; mime: string; tamanho: number }) {
  const emp = await getEmpresa();
  if ((await meuPapel()) !== "dono") throw new Error("Só o dono anexa arquivos.");
  if (!MIMES.includes(p.mime)) throw new Error("Formato não permitido. Use PNG, JPG, WEBP ou PDF.");
  if (!(p.tamanho > 0 && p.tamanho <= MAX)) throw new Error("O arquivo precisa ter até 10 MB.");
  if (!p.path.startsWith(`${emp.id}/${p.osId}/`) || p.path.includes("..")) throw new Error("Caminho inválido.");
  const s = db();
  const { error } = await s.from("os_arquivos").insert({ os_id: p.osId, nome: p.nome.slice(0, 120), path: p.path, mime: p.mime, tamanho: Math.round(p.tamanho) });
  if (error) {
    await s.storage.from("layouts").remove([p.path]);
    throw new Error(error.message);
  }
  revalidatePath("/os");
  revalidatePath("/producao");
}

export async function excluirArquivo(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const { data } = await s.from("os_arquivos").select("path").eq("id", id).maybeSingle();
  const { error } = await s.from("os_arquivos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (data?.path) await s.storage.from("layouts").remove([data.path as string]);
  revalidatePath("/os");
  revalidatePath("/producao");
}
