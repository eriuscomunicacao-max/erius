"use client";
import { useState } from "react";

export default function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(link); } catch {
      const el = document.getElementById(`lk-${link.slice(-8)}`) as HTMLInputElement | null;
      el?.select(); document.execCommand("copy");
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <div className="flex gap-2">
      <input id={`lk-${link.slice(-8)}`} readOnly value={link} className="campo font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={copiar} className="botao2 shrink-0">{copiado ? "Copiado!" : "Copiar"}</button>
    </div>
  );
}
