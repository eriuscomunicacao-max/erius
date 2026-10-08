"use client";
export default function Erro({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <div className="painel max-w-xl p-6">
        <h2 className="titulo">Não foi possível carregar os dados</h2>
        <p className="mt-2 text-sm text-mute">{error.message}</p>
        <p className="mt-2 text-sm text-mute">
          Confira se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas na Vercel e se o arquivo supabase/schema.sql foi rodado.
        </p>
        <button onClick={reset} className="botao mt-4">Tentar de novo</button>
      </div>
    </div>
  );
}
