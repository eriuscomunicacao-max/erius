import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PrivacidadeProvider } from "@/components/Privacidade";
import { getEmpresaOuNull } from "@/lib/empresa";
import { db } from "@/lib/supabase";
import { getAssinatura } from "@/lib/assinatura";
import { meuPapel } from "@/lib/papel";
import { estadoDe, diasRestantes } from "@/lib/assinatura-regras";
import BannerAssinatura from "@/components/BannerAssinatura";
import WhatsAppFlutuante from "@/components/WhatsAppFlutuante";

export const metadata: Metadata = {
  title: "OrçaGrafica",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const emp = await getEmpresaOuNull();
  let logoUrl: string | null = null;
  if (emp?.logo_path) {
    const { data } = await db().storage.from("logos").createSignedUrl(emp.logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }
  const papel = emp ? await meuPapel() : null;
  const ass = emp && papel === "dono" ? await getAssinatura() : null;
  const emTeste = ass && estadoDe(ass) === "trial";
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Saira:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={emp ? "min-h-screen lg:flex" : "min-h-screen"}>
        <PrivacidadeProvider>
          {emp ? (
            <>
              <Suspense fallback={<div className="lg:w-[218px]" />}>
                <Sidebar nome={emp.nome} logoUrl={logoUrl} papel={papel} />
              </Suspense>
              <main className="min-w-0 flex-1">
                {emTeste && <BannerAssinatura dias={diasRestantes(ass!.trial_ate)} />}
                {children}
              </main>
              {papel === "dono" && <WhatsAppFlutuante empresa={emp.nome} />}
            </>
          ) : (
            children
          )}
        </PrivacidadeProvider>
      </body>
    </html>
  );
}
