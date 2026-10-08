"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PagamentoPix({
  imagem, payload, valor, vencimento, invoiceUrl,
}: { imagem: string | null; payload: string | null; valor: string; vencimento: string; invoiceUrl: string | null }) {
  const router = useRouter();
  const [pago, setPago] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const tentativas = useRef(0);

  useEffect(() => {
    if (pago) return;
    const t = setInterval(async () => {
      tentativas.current += 1;
      // a cada 4ª consulta (~20s) também confere direto na Asaas
      const confirmar = tentativas.current % 4 === 0 ? "?confirmar=1" : "";
      try {
        const r = await fetch(`/assinatura/status${confirmar}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (d.estado === "ativo" || d.estado === "gratis") setPago(true);
      } catch { /* sem rede: tenta de novo */ }
    }, 5000);
    return () => clearInterval(t);
  }, [pago]);

  useEffect(() => {
    if (!pago) return;
    const t = setTimeout(() => { router.replace("/"); router.refresh(); }, 2500);
    return () => clearTimeout(t);
  }, [pago, router]);

  async function copiar() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const el = document.getElementById("pix-payload") as HTMLTextAreaElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (pago) {
    return (
      <section className="painel p-6 text-center" role="status">
        <p className="font-display text-2xl font-bold text-ciano">Pagamento confirmado!</p>
        <p className="mt-2 text-sm text-mute">Seu acesso foi liberado. Levando você pro painel...</p>
      </section>
    );
  }

  return (
    <section className="painel p-5">
      <h2 className="titulo mb-1">Pague com Pix</h2>
      <p className="mb-4 text-sm text-mute">Valor: <b className="text-ink">{valor}</b> · vencimento {vencimento}</p>

      {imagem && payload ? (
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <img src={`data:image/png;base64,${imagem}`} alt="QR Code Pix" className="mx-auto h-[220px] w-[220px] rounded-lg bg-white p-2" />
          <div className="space-y-3">
            <p className="text-sm text-ink">Abra o app do seu banco, escolha <b>Pix</b> e leia o QR Code. Ou use o <b>copia e cola</b>:</p>
            <textarea id="pix-payload" readOnly value={payload} rows={4} className="campo font-mono text-xs" />
            <button type="button" onClick={copiar} className="botao">{copiado ? "Copiado!" : "Copiar código Pix"}</button>
            <p className="text-xs text-mute">Assim que o pagamento cair, esta tela atualiza sozinha. Pode deixar aberta.</p>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-amarelo/40 p-3 text-sm text-amarelo">
          Não consegui gerar o QR Code agora. Use a página segura de pagamento abaixo.
        </p>
      )}

      {invoiceUrl && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-mute">
          Prefere cartão de crédito ou boleto?{" "}
          <a href={invoiceUrl} className="text-ciano underline">Pagar na página segura da Asaas</a>
        </p>
      )}
    </section>
  );
}
