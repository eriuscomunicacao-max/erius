"use client";
export default function Excluir({ action, id, texto = "Excluir este registro?" }: { action: (fd: FormData) => void; id: string; texto?: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(texto)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="rounded p-1.5 text-mute hover:bg-vermelho/15 hover:text-vermelho" aria-label="Excluir" title="Excluir">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
      </button>
    </form>
  );
}
