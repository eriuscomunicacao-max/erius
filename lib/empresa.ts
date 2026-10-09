import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { rgb } from "pdf-lib";
import { db } from "./supabase";

export type Empresa = {
  id: string; nome: string; cnpj: string | null; telefone: string | null; email: string | null;
  endereco: string | null; logo_path: string | null; cor_primaria: string; cor_secundaria: string;
};

/** Empresa do usuário logado (RLS já filtra). Sem login → /login; sem empresa → /onboarding. */
export const getEmpresa = cache(async (): Promise<Empresa> => {
  const s = db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await s.from("empresas").select("*").limit(1).maybeSingle();
  if (!data) redirect("/onboarding");
  return data as Empresa;
});

/** Mesma coisa, mas devolve null em vez de redirecionar (layout / onboarding). */
export const getEmpresaOuNull = cache(async (): Promise<Empresa | null> => {
  const { data } = await db().from("empresas").select("*").limit(1).maybeSingle();
  return (data as Empresa) ?? null;
});

export function hexParaRgb(hex: string, padrao = "#2563EB") {
  const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : padrao;
  return rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
}

/** Cores da empresa para os PDFs: primária, secundária e uma mistura das duas. */
export function coresPdf(e: Empresa) {
  const a = hexParaRgb(e.cor_primaria, "#2563EB");
  const b = hexParaRgb(e.cor_secundaria, "#F97316");
  const m = rgb((a.red + b.red) / 2, (a.green + b.green) / 2, (a.blue + b.blue) / 2);
  return { PRIM: a, SEC: b, MIX: m };
}


/** Baixa a logo da empresa do Storage (PNG/JPG). Devolve null se não houver. */
export async function logoDaEmpresa(e: Empresa): Promise<{ bytes: Uint8Array; png: boolean } | null> {
  if (!e.logo_path) return null;
  const { data, error } = await db().storage.from("logos").download(e.logo_path);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  return { bytes, png };
}

/** Desenha a logo dentro de uma caixa (mantém proporção). Retorna true se desenhou. */
export async function desenharLogo(
  pdf: import("pdf-lib").PDFDocument, page: import("pdf-lib").PDFPage, e: Empresa,
  box: { x: number; y: number; w: number; h: number; direita?: boolean },
) {
  try {
    const l = await logoDaEmpresa(e);
    if (!l) return false;
    const img = l.png ? await pdf.embedPng(l.bytes) : await pdf.embedJpg(l.bytes);
    const k = Math.min(box.w / img.width, box.h / img.height);
    const w = img.width * k, h = img.height * k;
    page.drawImage(img, { x: box.direita ? box.x + box.w - w : box.x, y: box.y + (box.h - h) / 2, width: w, height: h });
    return true;
  } catch {
    return false;
  }
}


export { pdfTxt, telefoneBR, documentoBR, rodapeInfo } from "./pdf-texto";
