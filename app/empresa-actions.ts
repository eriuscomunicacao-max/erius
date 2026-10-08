"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";

const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};
const num = (v: FormDataEntryValue | null) => {
  let s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const x = Number(s);
  return isFinite(x) && x >= 0 ? x : 0;
};
const HEX = /^#[0-9a-fA-F]{6}$/;

async function run(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

/* ---------- Dados da empresa e cores dos PDFs ---------- */
export async function salvarEmpresa(fd: FormData) {
  const e = await getEmpresa();
  const prim = String(fd.get("cor_primaria") ?? "");
  const sec = String(fd.get("cor_secundaria") ?? "");
  await run(
    db().from("empresas").update({
      nome: txt(fd.get("nome")) ?? e.nome,
      cnpj: txt(fd.get("cnpj")),
      telefone: txt(fd.get("telefone")),
      email: txt(fd.get("email")),
      endereco: txt(fd.get("endereco")),
      cor_primaria: HEX.test(prim) ? prim : e.cor_primaria,
      cor_secundaria: HEX.test(sec) ? sec : e.cor_secundaria,
    }).eq("id", e.id)
  );
  revalidatePath("/", "layout");
}

/* ---------- Logo (PNG/JPG até 2 MB; confere o conteúdo real do arquivo) ---------- */
export async function enviarLogo(fd: FormData) {
  const e = await getEmpresa();
  const f = fd.get("logo");
  if (!(f instanceof File) || f.size === 0) return;
  if (f.size > 2 * 1024 * 1024) throw new Error("A logo precisa ter no máximo 2 MB.");
  const b = new Uint8Array(await f.arrayBuffer());
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (!png && !jpg) throw new Error("Envie a logo em PNG ou JPG.");
  const path = `${e.id}/logo.${png ? "png" : "jpg"}`;
  const s = db();
  if (e.logo_path && e.logo_path !== path) await s.storage.from("logos").remove([e.logo_path]);
  const up = await s.storage.from("logos").upload(path, b, { upsert: true, contentType: png ? "image/png" : "image/jpeg" });
  if (up.error) throw new Error(up.error.message);
  await run(s.from("empresas").update({ logo_path: path }).eq("id", e.id));
  revalidatePath("/", "layout");
}

export async function removerLogo() {
  const e = await getEmpresa();
  const s = db();
  if (e.logo_path) await s.storage.from("logos").remove([e.logo_path]);
  await run(s.from("empresas").update({ logo_path: null }).eq("id", e.id));
  revalidatePath("/", "layout");
}

/* ---------- Materiais ---------- */
export async function criarMaterial(fd: FormData) {
  await run(
    db().from("materiais").insert({
      nome: txt(fd.get("nome")) ?? "Material",
      unidade: txt(fd.get("unidade")) ?? "un",
      custo_unitario: num(fd.get("custo_unitario")),
      fornecedor: txt(fd.get("fornecedor")),
      estoque: txt(fd.get("estoque")) ? num(fd.get("estoque")) : null,
      observacoes: txt(fd.get("observacoes")),
    })
  );
  revalidatePath("/materiais");
}

export async function atualizarMaterial(fd: FormData) {
  await run(
    db().from("materiais").update({
      nome: txt(fd.get("nome")) ?? "Material",
      unidade: txt(fd.get("unidade")) ?? "un",
      custo_unitario: num(fd.get("custo_unitario")),
      fornecedor: txt(fd.get("fornecedor")),
      estoque: txt(fd.get("estoque")) ? num(fd.get("estoque")) : null,
      observacoes: txt(fd.get("observacoes")),
    }).eq("id", String(fd.get("id")))
  );
  revalidatePath("/materiais");
}

export async function excluirMaterial(fd: FormData) {
  await run(db().from("materiais").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/materiais");
}
