import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { enviarCapi } from "@/lib/meta-capi";
import { adminDb } from "@/lib/supabase-admin";
import { CLICK_RE, PLANILHA } from "@/lib/planilha-produto";

export const dynamic = "force-dynamic";

// Cakto não assina o payload: o segredo vem DENTRO do corpo (body.secret) e é diferente em cada webhook.
// CAKTO_SECRET_PLANILHA aceita 1 secret ou vários separados por vírgula.
function secretsConfigurados() {
  return (process.env.CAKTO_SECRET_PLANILHA ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length >= 8);
}

function conferirSecret(recebido: string) {
  const esperados = secretsConfigurados();
  const a = Buffer.from(recebido);
  const ok = esperados.some((e) => {
    const b = Buffer.from(e);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  return { ok, esperados };
}

const EVENTOS_COMPRA = ["purchase_approved"];
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://orcagrafica.vercel.app";
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  const recebido = str(body.secret);
  const { ok, esperados } = conferirSecret(recebido);
  if (!ok) {
    // TEMPORÁRIO: o campo "motivo" ajuda a achar o problema no histórico da Cakto. Remova depois que o teste passar.
    const motivo =
      esperados.length === 0
        ? "A variável CAKTO_SECRET_PLANILHA não está definida (ou está vazia) neste deploy. Crie a variável na Vercel (Production) e faça um redeploy."
        : `O secret recebido (começa com ${recebido.slice(0, 8)}, ${recebido.length} caracteres) não bate com os ${esperados.length} secret(s) configurado(s) (tamanhos: ${esperados.map((e) => e.length).join(", ")}).`;
    console.error("cakto-planilha: 401 -", motivo);
    return NextResponse.json({ error: "não autorizado", motivo }, { status: 401 });
  }

  const evento = str(body.event);
  if (!EVENTOS_COMPRA.includes(evento)) return NextResponse.json({ ok: true, ignorado: evento });

  const d = (body.data ?? {}) as Record<string, unknown>;
  const c = (d.customer ?? {}) as Record<string, unknown>;
  const orderId = str(d.refId) || str(d.id);
  if (!orderId) {
    console.error("cakto-planilha: payload sem refId/id", Object.keys(d));
    return NextResponse.json({ ok: true, ignorado: "sem id" }); // 200 para a Cakto não reenviar à toa
  }

  const email = str(c.email);
  const phone = str(c.phone) || str(c.cellphone) || str(c.whatsapp);
  const nome = str(c.name);
  const cpf = str(c.docNumber) || str(c.cpf) || str(c.document);

  try {
    const db = adminDb();

    // idempotência: a Cakto reenvia se não receber 2xx; cada compra vira só 1 Purchase
    const { data: ja } = await db.from("planilha_compras").select("order_id, enviado").eq("order_id", orderId).maybeSingle();
    if (ja?.enviado) return NextResponse.json({ ok: true, duplicado: true });
    if (!ja) await db.from("planilha_compras").insert({ order_id: orderId, email: email || null, valor: PLANILHA.valor });

    // acha o clique de origem (o id pl_... volta em data.sck / data.src)
    const m = JSON.stringify(body).match(CLICK_RE);
    let clique: { fbp?: string | null; fbc?: string | null; ip?: string | null; ua?: string | null; url?: string | null } | null = null;
    if (m) {
      const { data } = await db.from("planilha_cliques").select("fbp, fbc, ip, ua, url").eq("id", m[0]).maybeSingle();
      clique = data ?? null;
    }

    console.log("cakto-planilha", { orderId, clickIdNoPayload: !!m, cliqueEncontrado: !!clique, fbpDaCakto: !!str(d.fbp), fbcDaCakto: !!str(d.fbc) });

    await enviarCapi({
      nome: "Purchase",
      eventId: orderId,
      url: clique?.url ?? `${SITE}/planilha`,
      user: {
        email,
        phone,
        nome,
        cpf,
        ip: clique?.ip,
        ua: clique?.ua,
        fbp: clique?.fbp ?? (str(d.fbp) || null), // reserva: o fbp que a própria Cakto enviou
        fbc: clique?.fbc ?? (str(d.fbc) || null),
      },
      custom: {
        value: PLANILHA.valor,
        currency: PLANILHA.moeda,
        content_name: PLANILHA.nome,
        content_ids: [PLANILHA.id],
        content_type: "product",
        num_items: 1,
        order_id: orderId,
      },
    });

    await db.from("planilha_compras").update({ enviado: true, enviado_em: new Date().toISOString() }).eq("order_id", orderId);
    return NextResponse.json({ ok: true, clique: !!clique });
  } catch (e) {
    // 500 faz a Cakto tentar de novo
    console.error("webhook cakto-planilha:", e);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
