import MetaPixel from "@/components/MetaPixel";
import { getEmpresa } from "@/lib/empresa";

export const dynamic = "force-dynamic";

// Página de passagem: registra o início do teste grátis (StartTrial) e segue para as configurações
export default async function Pronto() {
  await getEmpresa();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-bold">Conta criada!</h1>
      <p className="mt-2 text-mute">Seu teste grátis de 3 dias começou. Levando você para as configurações...</p>
      <MetaPixel evento="StartTrial" umaVez="trial" dados={{ value: 0, currency: "BRL" }} depois="/config" />
      <a href="/config" className="botao mx-auto mt-6">Continuar</a>
    </div>
  );
}
