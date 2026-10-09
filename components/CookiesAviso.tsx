"use client";
import { useEffect, useState } from "react";

/** Aviso de cookies de marketing (Pixel). A escolha fica salva no navegador. */
export default function CookiesAviso() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      setMostrar(!localStorage.getItem("cookies_marketing"));
    } catch { /* sem storage */ }
  }, []);

  function escolher(v: "sim" | "nao") {
    try {
      localStorage.setItem("cookies_marketing", v);
    } catch { /* sem storage */ }
    setMostrar(false);
    window.dispatchEvent(new Event("cookies-marketing"));
  }

  if (!mostrar) return null;
  return (
    <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-line bg-panel p-4 shadow-2xl sm:left-4 sm:right-auto">
      <p className="text-sm text-ink">
        Usamos cookies para medir o resultado dos nossos anúncios e melhorar a sua experiência. Você aceita?
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => escolher("sim")} className="botao py-1.5 text-sm">Aceitar</button>
        <button type="button" onClick={() => escolher("nao")} className="botao2 py-1.5 text-sm">Recusar</button>
      </div>
    </div>
  );
}
