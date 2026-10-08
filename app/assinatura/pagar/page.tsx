import { redirect } from "next/navigation";
import Cabecalho from "@/components/Cabecalho";
import PagamentoPix from "@/components/PagamentoPix";
import { getEmpresa } from "@/lib/empresa";
import { getAssinatura, precoDoPlano } from "@/lib/assinatura";
import { estadoDe } from "@/lib/assinatura-regras";
import { cobrancaEmAberto, qrPix } from "@/lib/asaas";
import { brl, dataBR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Pagar() {
  await getEmpresa();
  const a = await getAssinatura();
  if (!a?.asaas_subscription_id) redirect("/assinatura?erro=" + encodeURIComponent("Você ainda não iniciou uma assinatura."));
  const estado = estadoDe(a);
  if (estado === "ativo" || estado === "gratis") redirect("/assinatura");

  let cobranca = null;
  try {
    cobranca = await cobrancaEmAberto(a.asaas_subscription_id);
  } catch (e) {
    console.error("pagar/cobranca:", e);
  }
  if (!cobranca) redirect("/assinatura?erro=" + encodeURIComponent("Nenhuma cobrança em aberto no momento. Tente de novo em instantes."));

  let qr: { encodedImage: string; payload: string } | null = null;
  try {
    qr = await qrPix(cobranca.id);
  } catch (e) {
    console.error("pagar/qr:", e); // sem chave Pix na Asaas, por exemplo → cai pro link seguro
  }

  return (
    <>
      <Cabecalho titulo="Pagamento" sub="Pix, cartão ou boleto" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-5">
        <PagamentoPix
          imagem={qr?.encodedImage ?? null}
          payload={qr?.payload ?? null}
          valor={brl(cobranca.value ?? precoDoPlano())}
          vencimento={cobranca.dueDate ? dataBR(cobranca.dueDate) : "—"}
          invoiceUrl={cobranca.invoiceUrl ?? null}
        />
        <a href="/assinatura" className="text-sm text-mute underline">Voltar</a>
      </div>
    </>
  );
}
