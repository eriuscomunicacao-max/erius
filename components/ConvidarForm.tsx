"use client";
import { useState } from "react";
import Enviar from "./Enviar";

export default function ConvidarForm({
  action, custo, custoTxt,
}: { action: (fd: FormData) => void | Promise<void>; custo: boolean; custoTxt: string }) {
  const [nome, setNome] = useState("");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (custo && !confirm(`Este funcionário é adicional e soma ${custoTxt}/mês na sua mensalidade. Confirmar?`)) e.preventDefault();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-[220px] flex-1">
        <label className="rotulo" htmlFor="nome-func">Nome do funcionário</label>
        <input id="nome-func" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} className="campo" placeholder="Ex: João (produção)" />
      </div>
      <Enviar>{custo ? `Gerar convite (+${custoTxt}/mês)` : "Gerar convite (incluso)"}</Enviar>
    </form>
  );
}
