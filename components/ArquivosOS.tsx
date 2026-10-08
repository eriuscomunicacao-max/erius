"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { registrarArquivo, excluirArquivo } from "@/app/os-arquivos-actions";

type Arq = { id: string; nome: string; mime: string; url: string | null };
const OK = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX = 10 * 1024 * 1024;

export default function ArquivosOS({
  osId, empresaId, arquivos, podeEditar,
}: { osId: string; empresaId: string; arquivos: Arq[]; podeEditar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(f: File) {
    setErro("");
    if (!OK.includes(f.type)) return setErro("Use PNG, JPG, WEBP ou PDF.");
    if (f.size > MAX) return setErro("O arquivo precisa ter até 10 MB.");
    setEnviando(true);
    try {
      const ext = f.type === "application/pdf" ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${empresaId}/${osId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabaseBrowser().storage.from("layouts").upload(path, f, { contentType: f.type });
      if (error) throw new Error(error.message);
      await registrarArquivo({ osId, path, nome: f.name, mime: f.type, tamanho: f.size });
      router.refresh();
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível enviar.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  if (!arquivos.length && !podeEditar) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 text-xs text-mute">Layout / arquivos</div>
      <div className="flex flex-wrap gap-3">
        {arquivos.map((a) => (
          <div key={a.id} className="w-[120px]">
            {a.url ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                {a.mime.startsWith("image/") ? (
                  <img src={a.url} alt={a.nome} className="h-[90px] w-[120px] rounded-lg border border-line bg-bg object-cover" />
                ) : (
                  <span className="flex h-[90px] w-[120px] items-center justify-center rounded-lg border border-line bg-bg text-sm font-semibold text-ciano">PDF</span>
                )}
              </a>
            ) : (
              <span className="flex h-[90px] w-[120px] items-center justify-center rounded-lg border border-line text-xs text-mute">indisponível</span>
            )}
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="truncate text-[11px] text-mute" title={a.nome}>{a.nome}</span>
              {podeEditar && (
                <form action={excluirArquivo} onSubmit={(e) => { if (!confirm("Remover este arquivo?")) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-mute hover:text-magenta" aria-label="Remover arquivo">✕</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      {podeEditar && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" id={`arq-${osId}`}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); }} />
          <label htmlFor={`arq-${osId}`} className={`botao2 cursor-pointer py-1 text-sm ${enviando ? "opacity-60" : ""}`}>
            {enviando ? "Enviando..." : "Anexar layout"}
          </label>
          <span className="text-[11px] text-mute">PNG, JPG, WEBP ou PDF · até 10 MB</span>
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-magenta" role="alert">{erro}</p>}
    </div>
  );
}
