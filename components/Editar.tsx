"use client";
import { useRef, useState } from "react";
import Enviar from "./Enviar";

// Botão de lápis que abre uma janela com o formulário de edição
export default function Editar({
  titulo, action, children, rotulo,
}: { titulo: string; action: (fd: FormData) => Promise<void>; children: React.ReactNode; rotulo?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => { setErro(""); ref.current?.showModal(); }}
        className={rotulo ? "botao2 py-1.5 text-sm" : "rounded p-1.5 text-mute hover:bg-ciano/15 hover:text-ciano"}
        aria-label={`Editar: ${titulo}`}
        title="Editar"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></svg>
        {rotulo}
      </button>
      <dialog ref={ref} className="w-[min(620px,94vw)] rounded-xl border border-line bg-panel p-0 text-left text-ink backdrop:bg-black/70">
        <form
          action={async (fd) => {
            try { await action(fd); ref.current?.close(); } catch (e: any) { setErro(e?.message ?? "Erro ao salvar."); }
          }}
          className="space-y-3 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="titulo">{titulo}</h3>
            <button type="button" onClick={() => ref.current?.close()} className="rounded p-1 text-mute hover:text-ink" aria-label="Fechar">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">{children}</div>
          {erro && <p className="text-sm text-magenta">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <Enviar>Salvar alterações</Enviar>
            <button type="button" onClick={() => ref.current?.close()} className="botao2">Cancelar</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Campo pronto pra usar dentro do Editar
export function Campo({
  nome, rotulo, valor, tipo = "text", largo, opcoes, decimal,
}: { nome: string; rotulo: string; valor?: string | number | null; tipo?: string; largo?: boolean; opcoes?: readonly string[]; decimal?: boolean }) {
  const v = valor ?? "";
  return (
    <div className={largo ? "col-span-2" : ""}>
      <label className="rotulo" htmlFor={`ed-${nome}`}>{rotulo}</label>
      {opcoes ? (
        <select id={`ed-${nome}`} name={nome} defaultValue={String(v)} className="campo">
          {!opcoes.includes(String(v)) && v !== "" && <option>{String(v)}</option>}
          {opcoes.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input id={`ed-${nome}`} name={nome} type={tipo} defaultValue={String(v)} inputMode={decimal ? "decimal" : undefined} className="campo" />
      )}
    </div>
  );
}

