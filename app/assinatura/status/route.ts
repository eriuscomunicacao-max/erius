import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { adminDb } from "@/lib/supabase-admin";
import { estadoDe, type Assinatura } from "@/lib/assinatura-regras";
import { confirmarPagamentoNaAsaas } from "@/lib/assinatura-confirmar";

export const dynamic = "force-dynamic";

async function ler() {
  const { data } = await db().from("assinaturas").select("*").maybeSingle();
  return (data as Assinatura) ?? null;
}

export async function GET(req: NextRequest) {
  let a = await ler();
  if (!a) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  // ?confirmar=1 → além do banco, confere direto na Asaas (rede de segurança do webhook)
  const estado = estadoDe(a);
  if (req.nextUrl.searchParams.get("confirmar") === "1" && estado !== "ativo" && estado !== "gratis") {
    try {
      if (await confirmarPagamentoNaAsaas(adminDb(), a)) a = (await ler()) ?? a;
    } catch (e) {
      console.error("status/confirmar:", e);
    }
  }
  return NextResponse.json({ estado: estadoDe(a), pagoAte: a.pago_ate });
}
