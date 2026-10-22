"use client";
import { useEffect, useState } from "react";

/** Aviso de cookies discreto para a página da planilha (mesma escolha e mesmo evento do CookiesAviso). */
export default function CookiesPlanilha() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      setMostrar(!localStorage.getItem("cookies_marketing"));
    } catch {
      /* sem storage */
    }
  }, []);

  function escolher(v: "sim" | "nao") {
    try {
      localStorage.setItem("cookies_marketing", v);
    } catch {
      /* sem storage */
    }
    setMostrar(false);
    window.dispatchEvent(new Event("cookies-marketing"));
  }

  if (!mostrar) return null;
  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-[76px] z-[60] mx-auto flex max-w-xl items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg md:bottom-3"
    >
      <span className="flex-1">Usamos cookies para medir anúncios e melhorar a página.</span>
      <button type="button" onClick={() => escolher("sim")} className="rounded-md bg-[#00AEEF] px-3 py-1.5 font-semibold text-[#04121f]">
        Aceitar
      </button>
      <button type="button" onClick={() => escolher("nao")} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600">
        Recusar
      </button>
    </div>
  );
}
