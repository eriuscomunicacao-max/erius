import "server-only";
import { db } from "./supabase";

export type Arquivo = { id: string; os_id: string; nome: string; mime: string; url: string | null };

/** Arquivos de layout das OS, com link temporário (1h) para ver/baixar. */
export async function arquivosPorOS(osIds: string[]) {
  const mapa = new Map<string, Arquivo[]>();
  if (!osIds.length) return mapa;
  const s = db();
  const { data } = await s.from("os_arquivos").select("id, os_id, nome, path, mime").in("os_id", osIds).order("created_at");
  const rows = (data ?? []) as { id: string; os_id: string; nome: string; path: string; mime: string }[];
  if (!rows.length) return mapa;
  const { data: urls } = await s.storage.from("layouts").createSignedUrls(rows.map((r) => r.path), 3600);
  const porPath = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
  for (const r of rows) {
    const lista = mapa.get(r.os_id) ?? [];
    lista.push({ id: r.id, os_id: r.os_id, nome: r.nome, mime: r.mime, url: porPath.get(r.path) ?? null });
    mapa.set(r.os_id, lista);
  }
  return mapa;
}
