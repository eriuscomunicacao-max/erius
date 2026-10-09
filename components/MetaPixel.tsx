"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const PIXEL_ID = "1365761865397737";
// true = só carrega o Pixel depois que o visitante aceitar os cookies (recomendado pela LGPD)
const EXIGIR_CONSENTIMENTO = true;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
  }
}

const consentido = () => {
  if (!EXIGIR_CONSENTIMENTO) return true;
  try {
    return localStorage.getItem("cookies_marketing") === "sim";
  } catch {
    return false;
  }
};

/** Carrega o código oficial do Pixel (uma vez por página). */
function carregarPixel() {
  if (typeof window === "undefined" || window.fbq) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbq: any = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", PIXEL_ID);
}

/** Dispara um evento (só se o Pixel estiver carregado, ou seja, com consentimento). */
export function trackMeta(evento: string, dados?: Record<string, unknown>, eventID?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventID) window.fbq("track", evento, dados ?? {}, { eventID });
  else window.fbq("track", evento, dados ?? {});
}

type Props = {
  evento?: string;                 // ex: "CompleteRegistration"
  dados?: Record<string, unknown>; // ex: { value: 49.9, currency: "BRL" }
  eventID?: string;                // evita contar duas vezes (navegador + servidor)
  umaVez?: string;                 // chave: o evento sai só 1 vez neste navegador
  depois?: string;                 // depois de disparar, vai para esta página
};

// Evita contar duas vezes o mesmo evento na mesma página (ex: o modo de desenvolvimento do React roda tudo 2x)
const disparados = new Set<string>();
const unico = (nome: string) => {
  const chave = `${location.href}|${nome}`;
  if (disparados.has(chave)) return false;
  disparados.add(chave);
  return true;
};

/** Coloque em qualquer página: carrega o Pixel, registra o PageView e, se pedido, um evento. */
export default function MetaPixel({ evento, dados, eventID, umaVez, depois }: Props) {
  const router = useRouter();

  useEffect(() => {
    let feito = false;
    const disparar = () => {
      if (feito || !consentido()) return;
      feito = true;
      carregarPixel();
      if (unico("PageView")) window.fbq?.("track", "PageView");
      if (evento && unico(evento)) {
        const chave = umaVez ? `meta_${umaVez}` : null;
        let jaFoi = false;
        try {
          jaFoi = !!chave && localStorage.getItem(chave) === "1";
        } catch { /* sem storage */ }
        if (!jaFoi) {
          trackMeta(evento, dados, eventID);
          try {
            if (chave) localStorage.setItem(chave, "1");
          } catch { /* sem storage */ }
        }
      }
    };
    disparar();
    window.addEventListener("cookies-marketing", disparar); // quando aceitar o aviso de cookies
    const t = depois ? setTimeout(() => router.replace(depois), 900) : undefined;
    return () => {
      window.removeEventListener("cookies-marketing", disparar);
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
