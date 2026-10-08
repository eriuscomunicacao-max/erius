import Link from "next/link";

export default function BannerAssinatura({ dias }: { dias: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-amarelo/30 bg-amarelo/10 px-4 py-2 text-center text-sm text-amarelo">
      <span>Teste grátis: {dias === 0 ? "termina hoje" : `${dias} dia${dias > 1 ? "s" : ""} restante${dias > 1 ? "s" : ""}`}.</span>
      <Link href="/assinatura" className="font-semibold underline">Assinar agora</Link>
    </div>
  );
}
