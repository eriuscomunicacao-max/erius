"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { meuPapel } from "@/lib/papel";
import { documentoBR, telefoneBR } from "@/lib/pdf-texto";
import { enviarLogo } from "./empresa-actions";

const voltar = (m: string): never => redirect(`/comecar?erro=${encodeURIComponent(m)}`);
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};

/** Valida CPF (11) ou CNPJ (14) pelos dígitos verificadores. */
function documentoValido(d: string) {
  if (!/^\d+$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dig = (base: string, pesos: number[]) => {
    const s = base.split("").reduce((t, n, i) => t + Number(n) * pesos[i], 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (d.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    return dig(d.slice(0, 9), p1) === Number(d[9]) && dig(d.slice(0, 10), p2) === Number(d[10]);
  }
  if (d.length === 14) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    return dig(d.slice(0, 12), p1) === Number(d[12]) && dig(d.slice(0, 13), p2) === Number(d[13]);
  }
  return false;
}

/** Única etapa obrigatória: dados da empresa. Ao salvar, o sistema todo é liberado. */
export async function salvarDadosIniciais(fd: FormData) {
  await getEmpresa();
  if ((await meuPapel()) !== "dono") redirect("/producao");
  const emp = await getEmpresa();

  const nome = (txt(fd.get("nome")) ?? "").slice(0, 80);
  if (!nome) return voltar("Informe o nome da empresa.");

  const doc = String(fd.get("cnpj") ?? "").replace(/\D/g, "");
  if (!documentoValido(doc)) return voltar("CPF ou CNPJ inválido. Confira os números.");

  const tel = String(fd.get("telefone") ?? "").replace(/\D/g, "");
  if (tel.length < 10 || tel.length > 13) return voltar("Informe o WhatsApp com DDD, por exemplo (19) 99999-9999.");

  const { error } = await db()
    .from("empresas")
    .update({ nome, cnpj: documentoBR(doc).valor, telefone: telefoneBR(tel) })
    .eq("id", emp.id);
  if (error) return voltar("Não foi possível salvar. Tente de novo.");

  // logo é opcional: se falhar, os dados já estão salvos e o sistema é liberado do mesmo jeito
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      await enviarLogo(fd);
    } catch (e) {
      console.error("comecar/logo:", e); // a pessoa sobe a logo depois, em Configurações
    }
  }
  revalidatePath("/", "layout");
  redirect("/");
}
