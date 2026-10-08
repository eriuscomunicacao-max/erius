import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/supabase-admin";
import { aplicarEvento } from "@/lib/assinatura-webhook";

export const dynamic = "force-dynamic";

function tokenValido(recebido: string) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  if (esperado.length < 16) return false; // sem token forte configurado, recusa tudo
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!tokenValido(req.headers.get("asaas-access-token") ?? "")) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  let evento;
  try {
    evento = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  try {
    const r = await aplicarEvento(adminDb(), evento);
    return NextResponse.json(r);
  } catch (e) {
    // 500 faz a Asaas reenviar o evento depois (eles guardam por 14 dias)
    console.error("webhook asaas:", e);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
