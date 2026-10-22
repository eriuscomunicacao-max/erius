"use client";
import { useEffect, useState, type ReactNode } from "react";
import { trackMeta, consentido } from "@/components/MetaPixel";
import { PLANILHA } from "@/lib/planilha-produto";
import { enviarCapi, getClickId, uid } from "./track";

const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_PLANILHA ?? PLANILHA.checkout;
let jaDisparou = false;

function useCheckout() {
  const [href, setHref] = useState(CHECKOUT);

  useEffect(() => {
    // repassa UTMs/fbclid da página para o checkout e leva o id do clique (sck e src)
    const u = new URL(CHECKOUT);
    new URLSearchParams(window.location.search).forEach((v, k) => u.searchParams.set(k, v));
    const id = getClickId();
    u.searchParams.set("sck", id);
    u.searchParams.set("src", id);
    setHref(u.toString());
  }, []);

  const onClick = () => {
    if (jaDisparou) return;
    jaDisparou = true;
    const eventId = uid("ic");
    trackMeta(
      "InitiateCheckout",
      { content_name: PLANILHA.nome, content_ids: [PLANILHA.id], content_type: "product", value: PLANILHA.valor, currency: PLANILHA.moeda, num_items: 1 },
      eventId
    );
    if (consentido()) enviarCapi("InitiateCheckout", eventId, getClickId());
  };

  return { href, onClick };
}

export function Cta({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { href, onClick } = useCheckout();
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg bg-[#00AEEF] px-6 py-3 font-semibold text-[#06101c] shadow-[0_0_30px_-5px_#00AEEF] transition hover:brightness-110 ${className}`}
    >
      {children}
    </a>
  );
}

/** Botão fixo no celular: só aparece depois que o visitante rola além do começo da página. */
export function StickyCta({ preco }: { preco: string }) {
  const { href, onClick } = useCheckout();
  const [ver, setVer] = useState(false);

  useEffect(() => {
    const f = () => setVer(window.scrollY > 500);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  if (!ver) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#070B14]/95 p-3 backdrop-blur md:hidden">
      <a href={href} onClick={onClick} className="flex w-full items-center justify-center rounded-lg bg-[#00AEEF] py-3 font-semibold text-[#06101c]">
        Comprar por {preco}
      </a>
    </div>
  );
}
