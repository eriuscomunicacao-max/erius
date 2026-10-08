"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getEmpresa } from "@/lib/empresa";
import { hoje, mesAtual, ultimoDia } from "@/lib/format";

function valor(v: FormDataEntryValue | null) {
  let s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const x = Number(s);
  return isFinite(x) ? x : 0;
}
const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};
async function run(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}
function tudo() {
  ["/", "/assessor", "/clientes", "/os", "/gastos", "/fluxo", "/faturamento", "/config"].forEach((p) => revalidatePath(p));
}

/* ---------- Pedidos ---------- */
export async function criarPedido(fd: FormData) {
  const s = db();
  const { data: cfg } = await s.from("config").select("adicional_prioridade").maybeSingle();
  const { data, error } = await s
    .from("pedidos")
    .insert({
      cliente: txt(fd.get("cliente")) ?? "Sem nome",
      servico: txt(fd.get("servico")) ?? "Outros",
      descricao: txt(fd.get("descricao")),
      quantidade: Math.round(valor(fd.get("quantidade"))) || 1,
      data: txt(fd.get("data")) ?? hoje(),
      prioridade: fd.get("prioridade") === "on",
      valor_base: valor(fd.get("valor_base")),
      adicional_prioridade: Number(cfg?.adicional_prioridade ?? 0),
      forma_pagto: txt(fd.get("forma_pagto")) ?? "Pix",
      observacoes: txt(fd.get("observacoes")),
    })
    .select("id, data")
    .single();
  if (error) throw new Error(error.message);
  const pago = valor(fd.get("valor_pago"));
  if (pago > 0)
    await run(s.from("pagamentos").insert({ pedido_id: data.id, data: data.data, valor: pago, forma: txt(fd.get("forma_pagto")) ?? "Pix" }));
  tudo();
}

export async function registrarPagamento(fd: FormData) {
  const v = valor(fd.get("valor"));
  if (v <= 0) return;
  await run(
    db().from("pagamentos").insert({
      pedido_id: String(fd.get("pedido_id")),
      valor: v,
      data: txt(fd.get("data")) ?? hoje(),
      forma: txt(fd.get("forma")) ?? "Pix",
    })
  );
  tudo();
}

export async function excluirPedido(fd: FormData) {
  await run(db().from("pedidos").delete().eq("id", String(fd.get("id"))));
  tudo();
}

export async function excluirPagamento(fd: FormData) {
  await run(db().from("pagamentos").delete().eq("id", String(fd.get("id"))));
  tudo();
}

/* ---------- Gastos ---------- */
export async function criarGasto(fd: FormData) {
  const parc = String(fd.get("parcela") ?? "").match(/(\d+)\s*\/\s*(\d+)/);
  await run(
    db().from("gastos").insert({
      data: txt(fd.get("data")) ?? hoje(),
      descricao: txt(fd.get("descricao")) ?? "Gasto",
      categoria: txt(fd.get("categoria")) ?? "Outros",
      parcela_atual: parc ? Number(parc[1]) : null,
      parcela_total: parc ? Number(parc[2]) : null,
      valor: valor(fd.get("valor")),
      observacoes: txt(fd.get("observacoes")),
    })
  );
  tudo();
}

export async function excluirGasto(fd: FormData) {
  await run(db().from("gastos").delete().eq("id", String(fd.get("id"))));
  tudo();
}

/* ---------- Despesas fixas ---------- */
export async function lancarFixas(fd: FormData) {
  const s = db();
  const mes = txt(fd.get("mes")) ?? mesAtual();
  const { data: fixas } = await s.from("despesas_fixas").select("*").eq("ativo", true);
  const { data: existentes } = await s
    .from("gastos")
    .select("descricao")
    .gte("data", `${mes}-01`)
    .lte("data", ultimoDia(mes));
  const ja = new Set((existentes ?? []).map((g) => String(g.descricao).toLowerCase()));
  const novos = (fixas ?? [])
    .filter((f) => !ja.has(String(f.nome).toLowerCase()))
    .map((f) => ({ data: `${mes}-05`, descricao: f.nome, categoria: f.categoria, valor: f.valor, observacoes: "Despesa fixa" }));
  if (novos.length) await run(s.from("gastos").insert(novos));
  tudo();
}

export async function criarFixa(fd: FormData) {
  await run(
    db().from("despesas_fixas").insert({
      nome: txt(fd.get("nome")) ?? "Despesa",
      categoria: txt(fd.get("categoria")) ?? "Contas fixas",
      valor: valor(fd.get("valor")),
    })
  );
  tudo();
}

export async function alternarFixa(fd: FormData) {
  await run(db().from("despesas_fixas").update({ ativo: fd.get("ativo") !== "true" }).eq("id", String(fd.get("id"))));
  tudo();
}

export async function excluirFixa(fd: FormData) {
  await run(db().from("despesas_fixas").delete().eq("id", String(fd.get("id"))));
  tudo();
}

/* ---------- Config e preços ---------- */
export async function salvarConfig(fd: FormData) {
  const emp = await getEmpresa();
  await run(
    db().from("config").upsert({
      empresa_id: emp.id,
      caixa_inicial: valor(fd.get("caixa_inicial")),
      adicional_prioridade: valor(fd.get("adicional_prioridade")),
      markup_revenda: valor(fd.get("markup_revenda")),
      validade_dias: Math.round(valor(fd.get("validade_dias"))) || 15,
      prazo_padrao: txt(fd.get("prazo_padrao")),
      pagamento_padrao: txt(fd.get("pagamento_padrao")),
    })
  );
  tudo();
}

/* ---------- Orçamentos ---------- */
export async function criarOrcamento(fd: FormData) {
  const s = db();
  const cliente = txt(fd.get("cliente")) ?? "Sem nome";
  const itensJson = String(fd.get("itens") ?? "[]");
  const itens = JSON.parse(itensJson) as {
    tipo: "etiqueta" | "manual"; servico: string; tamanho: string | null;
    quantidade: number; descricao: string | null; valor_unitario: number; valor_total: number;
  }[];
  if (!itens.length) throw new Error("Adicione ao menos um item ao orçamento.");

  const { data: orc, error } = await s
    .from("orcamentos")
    .insert({
      cliente,
      data: txt(fd.get("data")) ?? hoje(),
      validade_dias: Math.round(valor(fd.get("validade_dias"))) || 15,
      prazo: txt(fd.get("prazo")) ?? "5 dias úteis após aprovação da arte",
      pagamento: txt(fd.get("pagamento")) ?? "50% na aprovação e 50% na entrega | PIX",
      observacoes: txt(fd.get("observacoes")),
      desconto_a_vista: fd.get("desconto_a_vista") ? valor(fd.get("desconto_a_vista")) : null,
      bonificacao: txt(fd.get("bonificacao")),
      producao_prioritaria: fd.get("producao_prioritaria") === "on",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await run(
    s.from("orcamento_itens").insert(
      itens.map((it, i) => ({
        orcamento_id: orc.id,
        tipo: it.tipo,
        servico: it.servico,
        tamanho: it.tamanho,
        quantidade: it.quantidade,
        descricao: it.descricao,
        valor_unitario: it.valor_unitario,
        valor_total: it.valor_total,
        ordem: i,
      }))
    )
  );
  tudo();
  revalidatePath("/orcamentos");
  return orc.id as number;
}

export async function aprovarOrcamento(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const { data: orc, error: e1 } = await s.from("orcamentos").select("*").eq("id", id).single();
  if (e1 || !orc) throw new Error(e1?.message ?? "Orçamento não encontrado.");
  const { data: itens, error: e2 } = await s.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem");
  if (e2) throw new Error(e2.message);

  const pedidosNovos = (itens ?? []).map((it) => ({
    cliente: orc.cliente,
    servico: it.servico,
    descricao: it.descricao ?? (it.tamanho ? `${it.tamanho}` : null),
    quantidade: it.quantidade,
    data: hoje(),
    prioridade: false,
    valor_base: Number(it.valor_total),
    adicional_prioridade: 0,
    forma_pagto: "Pix",
    observacoes: `Aprovado do orçamento #${id}`,
  }));
  if (pedidosNovos.length) await run(s.from("pedidos").insert(pedidosNovos));
  await run(s.from("orcamentos").update({ status: "aprovado" }).eq("id", id));
  tudo();
  revalidatePath("/orcamentos");
}

export async function recusarOrcamento(fd: FormData) {
  await run(db().from("orcamentos").update({ status: "recusado" }).eq("id", String(fd.get("id"))));
  revalidatePath("/orcamentos");
}

export async function excluirOrcamento(fd: FormData) {
  await run(db().from("orcamentos").delete().eq("id", String(fd.get("id"))));
  revalidatePath("/orcamentos");
}

/* ---------- Ordens de Serviço ---------- */
type ItemOS = { servico: string; descricao: string; quantidade: number; valor_unitario: number; valor_total: number };

type DadosOS = {
  cliente: string; telefone: string | null; data: string; prazo_entrega: string | null;
  forma: string; observacoes: string | null; pago: number; orcamento_id?: string | null; itens: ItemOS[];
};

// Cria a OS + o pedido em Clientes + o pagamento de entrada. Usado pela aba OS e pelo orçamento aprovado.
async function gravarOS(d: DadosOS) {
  const s = db();
  const total = Math.round(d.itens.reduce((t, i) => t + i.valor_total, 0) * 100) / 100;
  const { data: os, error } = await s
    .from("ordens_servico")
    .insert({
      cliente: d.cliente, telefone: d.telefone, data: d.data, prazo_entrega: d.prazo_entrega,
      forma_pagto: d.forma, observacoes: d.observacoes, ...(d.orcamento_id ? { orcamento_id: d.orcamento_id } : {}),
    })
    .select("id, numero")
    .single();
  if (error) throw new Error(error.message);

  const numero = String(os.numero).padStart(4, "0");
  const principal = [...d.itens].sort((a, b) => b.valor_total - a.valor_total)[0];
  const { data: ped, error: e2 } = await s
    .from("pedidos")
    .insert({
      cliente: d.cliente,
      servico: principal.servico,
      descricao: `OS #${numero} · ${d.itens.map((i) => `${i.quantidade}x ${i.descricao}`).join(" + ")}`.slice(0, 300),
      quantidade: d.itens.length === 1 ? d.itens[0].quantidade : 1,
      data: d.data,
      prioridade: false,
      valor_base: total,
      adicional_prioridade: 0,
      forma_pagto: d.forma,
      observacoes: d.orcamento_id ? "Gerado a partir de orçamento aprovado" : d.observacoes,
    })
    .select("id")
    .single();
  if (e2) {
    await s.from("ordens_servico").delete().eq("id", os.id);
    throw new Error(e2.message);
  }

  await run(s.from("os_itens").insert(d.itens.map((i, ordem) => ({ ...i, os_id: os.id, ordem }))));
  await run(s.from("ordens_servico").update({ pedido_id: ped.id }).eq("id", os.id));
  if (d.pago > 0) await run(s.from("pagamentos").insert({ pedido_id: ped.id, data: d.data, valor: d.pago, forma: d.forma }));
  return os.id as number;
}

export async function criarOS(fd: FormData) {
  const brutos = JSON.parse(String(fd.get("itens") ?? "[]")) as ItemOS[];
  const itens = brutos
    .filter((i) => String(i.descricao ?? "").trim())
    .map((i) => {
      const quantidade = Math.max(1, Math.round(Number(i.quantidade) || 1));
      const valor_unitario = Number(i.valor_unitario) || 0;
      return { servico: i.servico || "Outros", descricao: String(i.descricao).trim(), quantidade, valor_unitario, valor_total: Math.round(quantidade * valor_unitario * 100) / 100 };
    });
  if (!itens.length) throw new Error("Adicione ao menos um serviço com descrição.");
  await gravarOS({
    cliente: txt(fd.get("cliente")) ?? "Sem nome",
    telefone: txt(fd.get("telefone")),
    data: txt(fd.get("data")) ?? hoje(),
    prazo_entrega: txt(fd.get("prazo_entrega")),
    forma: txt(fd.get("forma_pagto")) ?? "Pix",
    observacoes: txt(fd.get("observacoes")),
    pago: valor(fd.get("valor_pago")),
    itens,
  });
  tudo();
}

// Orçamento aprovado → vira OS (que cria o pedido em Clientes)
export async function aprovarOrcamentoEmOS(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const { data: orc, error: e1 } = await s.from("orcamentos").select("*").eq("id", id).single();
  if (e1 || !orc) throw new Error(e1?.message ?? "Orçamento não encontrado.");
  if (orc.status === "aprovado") redirect("/os");
  const { data: its, error: e2 } = await s.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem");
  if (e2) throw new Error(e2.message);
  if (!its?.length) throw new Error("Orçamento sem itens.");

  const itens: ItemOS[] = its.map((it) => {
    const desc =
      it.tipo === "etiqueta"
        ? `Etiqueta ${it.tamanho ?? ""}${it.descricao ? ` ${it.descricao}` : ""}`.trim()
        : (it.descricao || it.servico);
    return {
      servico: it.servico || "Outros",
      descricao: desc,
      quantidade: Number(it.quantidade) || 1,
      valor_unitario: Number(it.valor_unitario) || 0,
      valor_total: Number(it.valor_total) || 0, // mantém o total exato do orçamento
    };
  });

  await gravarOS({
    cliente: orc.cliente,
    telefone: txt(fd.get("telefone")),
    data: hoje(),
    prazo_entrega: txt(fd.get("prazo_entrega")),
    forma: txt(fd.get("forma_pagto")) ?? "Pix",
    observacoes: orc.observacoes ?? null,
    pago: valor(fd.get("valor_pago")),
    orcamento_id: id,
    itens,
  });
  await run(s.from("orcamentos").update({ status: "aprovado" }).eq("id", id));
  tudo();
  revalidatePath("/orcamentos");
  redirect("/os");
}

export async function statusOS(fd: FormData) {
  const st = String(fd.get("status"));
  if (!["aberta", "producao", "pronta", "entregue"].includes(st)) return;
  await run(db().from("ordens_servico").update({ status: st }).eq("id", String(fd.get("id"))));
  revalidatePath("/os");
}

export async function excluirOS(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const { data: os } = await s.from("ordens_servico").select("pedido_id, numero").eq("id", id).single();
  // arquivos de layout saem do Storage junto (as linhas do banco caem em cascata)
  const { data: arqs } = await s.from("os_arquivos").select("path").eq("os_id", id);
  if (arqs?.length) await s.storage.from("layouts").remove(arqs.map((a) => a.path as string));
  // apaga o pedido junto (e os pagamentos dele), pra não sobrar cobrança fantasma
  if (os?.pedido_id) await run(s.from("pedidos").delete().eq("id", os.pedido_id));
  await run(s.from("ordens_servico").delete().eq("id", id));
  tudo();
  revalidatePath("/producao");
}

/* ---------- Meu Assessor ---------- */
export async function salvarAssessor(fd: FormData) {
  const s = db();
  const empId = (await getEmpresa()).id;
  const ids = fd.getAll("env_id").map(String);
  for (const id of ids) {
    await run(s.from("envelopes").update({ pct: valor(fd.get(`pct_${id}`)) }).eq("id", id));
  }
  await run(
    s.from("config").update({
      das_mensal: valor(fd.get("das_mensal")),
      assessor_inicio: txt(fd.get("assessor_inicio")) ?? hoje(),
    }).eq("empresa_id", empId)
  );
  tudo();
}

export async function retirarEnvelope(fd: FormData) {
  const v = valor(fd.get("valor"));
  const categoria = txt(fd.get("categoria"));
  if (v <= 0 || !categoria) return;
  const nome = txt(fd.get("nome")) ?? categoria;
  await run(
    db().from("gastos").insert({
      data: txt(fd.get("data")) ?? hoje(),
      descricao: txt(fd.get("descricao")) ?? (categoria === "Pró-labore" ? "Retirada de pró-labore" : `Retirada do envelope ${nome}`),
      categoria,
      valor: v,
    })
  );
  tudo();
}

/* ---------- Edição ---------- */
// Só atualiza os campos que vieram no formulário
const tem = (fd: FormData, k: string) => fd.has(k);

export async function atualizarGasto(fd: FormData) {
  const up: Record<string, unknown> = {};
  if (tem(fd, "data")) up.data = txt(fd.get("data")) ?? hoje();
  if (tem(fd, "descricao")) up.descricao = txt(fd.get("descricao")) ?? "Gasto";
  if (tem(fd, "categoria")) up.categoria = txt(fd.get("categoria")) ?? "Outros";
  if (tem(fd, "valor")) up.valor = valor(fd.get("valor"));
  if (tem(fd, "observacoes")) up.observacoes = txt(fd.get("observacoes"));
  if (tem(fd, "parcela")) {
    const parc = String(fd.get("parcela") ?? "").match(/(\d+)\s*\/\s*(\d+)/);
    up.parcela_atual = parc ? Number(parc[1]) : null;
    up.parcela_total = parc ? Number(parc[2]) : null;
  }
  await run(db().from("gastos").update(up).eq("id", String(fd.get("id"))));
  tudo();
}

export async function atualizarPedido(fd: FormData) {
  await run(
    db().from("pedidos").update({
      cliente: txt(fd.get("cliente")) ?? "Sem nome",
      servico: txt(fd.get("servico")) ?? "Outros",
      descricao: txt(fd.get("descricao")),
      quantidade: Math.round(valor(fd.get("quantidade"))) || 1,
      data: txt(fd.get("data")) ?? hoje(),
      prioridade: fd.get("prioridade") === "on",
      valor_base: valor(fd.get("valor_base")),
      forma_pagto: txt(fd.get("forma_pagto")) ?? "Pix",
      observacoes: txt(fd.get("observacoes")),
    }).eq("id", String(fd.get("id")))
  );
  tudo();
}

export async function atualizarPagamento(fd: FormData) {
  await run(
    db().from("pagamentos").update({
      valor: valor(fd.get("valor")),
      data: txt(fd.get("data")) ?? hoje(),
      forma: txt(fd.get("forma")) ?? "Pix",
    }).eq("id", String(fd.get("id")))
  );
  tudo();
}

export async function atualizarFixa(fd: FormData) {
  await run(
    db().from("despesas_fixas").update({
      nome: txt(fd.get("nome")) ?? "Despesa",
      categoria: txt(fd.get("categoria")) ?? "Contas fixas",
      valor: valor(fd.get("valor")),
    }).eq("id", String(fd.get("id")))
  );
  tudo();
}

export async function atualizarOrcamento(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const itens = JSON.parse(String(fd.get("itens") ?? "[]")) as {
    tipo: "etiqueta" | "manual"; servico: string; tamanho: string | null;
    quantidade: number; descricao: string | null; valor_unitario: number; valor_total: number;
  }[];
  if (!itens.length) throw new Error("O orçamento precisa de ao menos um item.");
  await run(
    s.from("orcamentos").update({
      cliente: txt(fd.get("cliente")) ?? "Sem nome",
      data: txt(fd.get("data")) ?? hoje(),
      validade_dias: Math.round(valor(fd.get("validade_dias"))) || 15,
      prazo: txt(fd.get("prazo")),
      pagamento: txt(fd.get("pagamento")),
      observacoes: txt(fd.get("observacoes")),
      bonificacao: txt(fd.get("bonificacao")),
      producao_prioritaria: fd.get("producao_prioritaria") === "on",
    }).eq("id", id)
  );
  // troca os itens: grava os novos antes de apagar os antigos (não perde nada se der erro)
  const { data: antigos } = await s.from("orcamento_itens").select("id").eq("orcamento_id", id);
  await run(
    s.from("orcamento_itens").insert(
      itens.map((it, i) => ({
        orcamento_id: id, tipo: it.tipo, servico: it.servico, tamanho: it.tamanho, quantidade: it.quantidade,
        descricao: it.descricao, valor_unitario: it.valor_unitario, valor_total: it.valor_total, ordem: i,
      }))
    )
  );
  const ids = (antigos ?? []).map((a) => a.id);
  if (ids.length) await run(s.from("orcamento_itens").delete().in("id", ids));
  tudo();
  revalidatePath("/orcamentos");
}

export async function atualizarOS(fd: FormData) {
  const s = db();
  const id = String(fd.get("id"));
  const brutos = JSON.parse(String(fd.get("itens") ?? "[]")) as ItemOS[];
  const itens = brutos
    .filter((i) => String(i.descricao ?? "").trim())
    .map((i) => {
      const quantidade = Math.max(1, Math.round(Number(i.quantidade) || 1));
      const valor_unitario = Number(i.valor_unitario) || 0;
      const valor_total = i.valor_total != null && Number(i.valor_total) > 0 ? Number(i.valor_total) : Math.round(quantidade * valor_unitario * 100) / 100;
      return { servico: i.servico || "Outros", descricao: String(i.descricao).trim(), quantidade, valor_unitario, valor_total };
    });
  if (!itens.length) throw new Error("A OS precisa de ao menos um serviço.");

  const cliente = txt(fd.get("cliente")) ?? "Sem nome";
  const data = txt(fd.get("data")) ?? hoje();
  const forma = txt(fd.get("forma_pagto")) ?? "Pix";
  const { data: os, error } = await s.from("ordens_servico").select("pedido_id, numero").eq("id", id).single();
  if (error) throw new Error(error.message);

  await run(
    s.from("ordens_servico").update({
      cliente, telefone: txt(fd.get("telefone")), data, prazo_entrega: txt(fd.get("prazo_entrega")),
      forma_pagto: forma, observacoes: txt(fd.get("observacoes")),
    }).eq("id", id)
  );
  const { data: antigos } = await s.from("os_itens").select("id").eq("os_id", id);
  await run(s.from("os_itens").insert(itens.map((i, ordem) => ({ ...i, os_id: id, ordem }))));
  const ids = (antigos ?? []).map((a) => a.id);
  if (ids.length) await run(s.from("os_itens").delete().in("id", ids));

  // mantém o pedido de Clientes igual à OS (pagamentos não mudam)
  if (os?.pedido_id) {
    const total = Math.round(itens.reduce((t, i) => t + i.valor_total, 0) * 100) / 100;
    const principal = [...itens].sort((a, b) => b.valor_total - a.valor_total)[0];
    const numero = String(os.numero).padStart(4, "0");
    await run(
      s.from("pedidos").update({
        cliente, servico: principal.servico, data, forma_pagto: forma, valor_base: total, prioridade: false,
        quantidade: itens.length === 1 ? itens[0].quantidade : 1,
        descricao: `OS #${numero} · ${itens.map((i) => `${i.quantidade}x ${i.descricao}`).join(" + ")}`.slice(0, 300),
      }).eq("id", os.pedido_id)
    );
  }
  tudo();
}
