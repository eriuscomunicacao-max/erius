"use client";
import type { ButtonHTMLAttributes } from "react";

/** Botão que pede confirmação antes de enviar o formulário (usa formAction de uma server action). */
export default function BotaoConfirmar({
  texto, children, className, ...resto
}: { texto: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...resto} className={className} onClick={(e) => { if (!confirm(texto)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
