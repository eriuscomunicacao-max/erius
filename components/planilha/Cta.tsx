"use client";
import { useEffect, useState, type ReactNode } from "react";

const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_PLANILHA ?? "https://pay.cakto.com.br/3s7ccp7_1231642";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function useHref() {
  const [href, setHref] = useState(CHECKOUT);
  useEffect(() => {
    const qs = window.location.search.replace(/^\?/, "");
    if (qs) setHref(CHECKOUT + (CHECKOUT.includes("?") ? "&" : "?") + qs);
  }, []);
  return href;
}

export function Cta({ children, className = "" }: { children: ReactNode; className?: string }) {
  const href = useHref();
  return (
    <a
      href={href}
      onClick={() => window.fbq?.("track", "InitiateCheckout")}
      className={`inline-flex items-center justify-center rounded-lg bg-[#00AEEF] px-6 py-3 font-semibold text-[#06101c] shadow-[0_0_30px_-5px_#00AEEF] transition hover:brightness-110 ${className}`}
    >
      {children}
    </a>
  );
}

export function StickyCta({ preco }: { preco: string }) {
  const href = useHref();
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#070B14]/95 p-3 backdrop-blur md:hidden">
      <a
        href={href}
        onClick={() => window.fbq?.("track", "InitiateCheckout")}
        className="flex w-full items-center justify-center rounded-lg bg-[#00AEEF] py-3 font-semibold text-[#06101c]"
      >
        Baixar a planilha · {preco}
      </a>
    </div>
  );
}
