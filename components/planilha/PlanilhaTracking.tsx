"use client";
import { useEffect } from "react";
import MetaPixel, { trackMeta, consentido } from "@/components/MetaPixel";
import { PLANILHA } from "@/lib/planilha-produto";
import { enviarCapi, uid } from "./track";

let viewContentEnviado = false;

/** Coloque uma vez na página: carrega o Pixel, registra o PageView e o ViewContent (navegador + servidor). */
export default function PlanilhaTracking() {
  useEffect(() => {
    const disparar = () => {
      if (viewContentEnviado || !consentido()) return;
      viewContentEnviado = true;
      const eventId = uid("vc");
      trackMeta(
        "ViewContent",
        { content_name: PLANILHA.nome, content_ids: [PLANILHA.id], content_type: "product", value: PLANILHA.valor, currency: PLANILHA.moeda },
        eventId
      );
      enviarCapi("ViewContent", eventId);
    };
    disparar();
    window.addEventListener("cookies-marketing", disparar); // quando aceitar o aviso de cookies
    return () => window.removeEventListener("cookies-marketing", disparar);
  }, []);

  return <MetaPixel />;
}
