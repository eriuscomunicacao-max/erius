/* eslint-disable @next/next/no-img-element */
export default function Logo({ nome, url }: { nome: string; url: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {url ? (
        <img src={url} alt={`Logo ${nome}`} className="max-h-10 max-w-[150px] object-contain" />
      ) : (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ciano/15 font-display text-lg font-bold text-ciano">
            {nome.trim().charAt(0).toUpperCase() || "O"}
          </span>
          <span className="truncate font-display text-[19px] font-bold text-ink">{nome}</span>
        </>
      )}
    </div>
  );
}
