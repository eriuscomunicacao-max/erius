"use client";
import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext<{ oculto: boolean; alternar: () => void }>({ oculto: false, alternar: () => {} });

export function PrivacidadeProvider({ children }: { children: React.ReactNode }) {
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    try { setOculto(localStorage.getItem("oculto") === "1"); } catch { /* sem storage */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.oculto = oculto ? "1" : "0";
  }, [oculto]);
  const alternar = () =>
    setOculto((o) => {
      try { localStorage.setItem("oculto", o ? "0" : "1"); } catch { /* sem storage */ }
      return !o;
    });
  return <Ctx.Provider value={{ oculto, alternar }}>{children}</Ctx.Provider>;
}

export const usePrivacidade = () => useContext(Ctx);

/** Envolve qualquer valor em R$: vira "R$ ••••" quando o olhinho está fechado. */
const RE_VALOR = /R\$[\s\u00a0]*[\d.]+(?:,\d+)?/g;
export function Valor({ children }: { children: React.ReactNode }) {
  const { oculto } = usePrivacidade();
  if (!oculto) return <>{children}</>;
  return <>{typeof children === "string" ? children.replace(RE_VALOR, "R$ ••••") : "R$ ••••"}</>;
}

export function BotaoOlho() {
  const { oculto, alternar } = usePrivacidade();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mute hover:border-mute hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {oculto && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}
