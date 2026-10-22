import { NextRequest, NextResponse } from "next/server";
import { enviarCapi } from "@/lib/meta-capi";
import { adminDb } from "@/lib/supabase-admin";
import { CLICK_RE, PLANILHA } from "@/lib/planilha-produto";

export const dynamic = "force-dynamic";

const PERMITIDOS = ["ViewContent", "InitiateCheckout"];
const txt = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : undefined);

export async function POST(req: NextRequest) {
  // só aceita chamadas feitas pelo próprio site
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "origem inválida" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "origem inválida" }, { status: 403 });
    }
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  const evento = txt(b.evento, 40) ?? "";
  const eventId = txt(b.eventId, 120) ?? "";
  if (!PERMITIDOS.includes(evento) || !eventId) return NextResponse.json({ error: "evento inválido" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = req.headers.get("user-agent");
  const url = txt(b.url);
  const fbp = txt(b.fbp, 200);
  const fbc = txt(b.fbc, 400);
  const clickId = txt(b.clickId, 60);

  // guarda IP/navegador/fbp/fbc do clique: o webhook de compra usa isso pra casar a venda com o anúncio
  if (evento === "InitiateCheckout" && clickId && CLICK_RE.test(clickId)) {
    try {
      await adminDb().from("planilha_cliques").upsert({ id: clickId, fbp, fbc, ip, ua, url, event_id: eventId }, { onConflict: "id" });
    } catch (e) {
      console.error("planilha_cliques:", e);
    }
  }

  try {
    await enviarCapi({
      nome: evento,
      eventId,
      url,
      user: { ip, ua, fbp, fbc },
      custom: {
        content_name: PLANILHA.nome,
        content_ids: [PLANILHA.id],
        content_type: "product",
        value: PLANILHA.valor,
        currency: PLANILHA.moeda,
        ...(evento === "InitiateCheckout" ? { num_items: 1 } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("capi planilha:", e);
    return NextResponse.json({ error: "falha ao enviar" }, { status: 500 });
  }
}
