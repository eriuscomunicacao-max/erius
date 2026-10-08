-- =========================================================
-- OrçaGrafica — schema multi-tenant (começa ZERADO, sem dados)
-- Rode inteiro no Supabase > SQL Editor, num projeto novo.
-- Isolamento: cada tabela tem empresa_id + RLS por usuário logado.
-- =========================================================

-- ---------- Empresas e membros ----------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  endereco text,
  logo_path text,                       -- caminho no bucket "logos": {empresa_id}/logo.png
  cor_primaria text not null default '#2563EB' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria text not null default '#F97316' check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.membros (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono','equipe')),
  created_at timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create unique index membros_um_por_usuario on public.membros (user_id);  -- 1 empresa por usuário (por enquanto)

-- Função usada em todas as políticas RLS
create or replace function public.minhas_empresas()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select empresa_id from public.membros where user_id = auth.uid()
$$;

-- Empresa do usuário logado: usada como DEFAULT de empresa_id (o app nem precisa enviar)
create or replace function public.empresa_atual()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select empresa_id from public.membros where user_id = auth.uid() limit 1
$$;

-- ---------- Configurações por empresa ----------
create table public.config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  caixa_inicial numeric(12,2) not null default 0,
  adicional_prioridade numeric(12,2) not null default 0,
  markup_revenda numeric(6,2) not null default 30,
  das_mensal numeric(12,2) not null default 0,
  assessor_inicio date not null default current_date,
  validade_dias integer not null default 15,
  prazo_padrao text default '5 dias úteis após aprovação da arte',
  pagamento_padrao text default '50% na aprovação e 50% na entrega | PIX'
);

-- ---------- Materiais (vinil, papel, chapa, tinta, lona...) ----------
create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome text not null,
  unidade text not null default 'un',   -- un, m, m2, folha, kg, l, milheiro...
  custo_unitario numeric(12,4) not null default 0,
  fornecedor text,
  estoque numeric(14,3),                -- opcional
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Produtos e serviços (catálogo livre) ----------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Outros',
  unidade text not null default 'un',   -- un, milheiro, m², m, hora, serviço
  preco numeric(12,2) not null default 0,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Tabela de preços opcional (tamanho x quantidade) ----------
create table public.precos (
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  tamanho text not null,
  quantidade integer not null,
  preco numeric(12,2) not null,
  primary key (empresa_id, tamanho, quantidade)
);

-- ---------- Pedidos e pagamentos ----------
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  cliente text not null,
  servico text not null,
  descricao text,
  quantidade integer default 1,
  data date not null default current_date,
  prioridade boolean not null default false,
  valor_base numeric(12,2) not null default 0,
  adicional_prioridade numeric(12,2) not null default 0,
  valor_total numeric(12,2) generated always as
    (valor_base + case when prioridade then adicional_prioridade else 0 end) stored,
  forma_pagto text default 'Pix',
  observacoes text,
  created_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  pedido_id uuid not null,
  data date not null default current_date,
  valor numeric(12,2) not null,
  forma text default 'Pix',
  created_at timestamptz not null default now(),
  -- garante que o pedido é da MESMA empresa
  foreign key (pedido_id, empresa_id) references public.pedidos(id, empresa_id) on delete cascade
);

-- ---------- Gastos ----------
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  data date not null default current_date,
  descricao text not null,
  categoria text not null,
  material_id uuid references public.materiais(id) on delete set null,
  parcela_atual integer,
  parcela_total integer,
  valor numeric(12,2) not null,
  observacoes text,
  created_at timestamptz not null default now()
);

create table public.despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Contas fixas',
  valor numeric(12,2) not null,
  ativo boolean not null default true
);

-- ---------- Orçamentos ----------
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,              -- sequencial por empresa (preenchido por trigger)
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  cliente text not null,
  data date not null default current_date,
  validade_dias integer not null default 15,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  prazo text,
  pagamento text,
  observacoes text,
  desconto_a_vista numeric(12,2),
  bonificacao text,
  producao_prioritaria boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, empresa_id),
  unique (empresa_id, numero)
);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  orcamento_id uuid not null,
  tipo text not null default 'manual' check (tipo in ('etiqueta','manual')),
  servico text not null default 'Outros',
  tamanho text,
  quantidade integer not null default 1,
  descricao text,
  valor_unitario numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  ordem integer not null default 0,
  foreign key (orcamento_id, empresa_id) references public.orcamentos(id, empresa_id) on delete cascade
);

-- ---------- Ordens de serviço ----------
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,              -- sequencial por empresa (preenchido por trigger)
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  cliente text not null,
  telefone text,
  data date not null default current_date,
  prazo_entrega date,
  status text not null default 'aberta' check (status in ('aberta','producao','pronta','entregue')),
  forma_pagto text default 'Pix',
  observacoes text,
  pedido_id uuid,
  orcamento_id uuid,
  created_at timestamptz not null default now(),
  unique (id, empresa_id),
  unique (empresa_id, numero),
  foreign key (pedido_id, empresa_id) references public.pedidos(id, empresa_id),
  foreign key (orcamento_id, empresa_id) references public.orcamentos(id, empresa_id)
);

create table public.os_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  os_id uuid not null,
  servico text not null default 'Outros',
  descricao text not null,
  quantidade integer not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  ordem integer not null default 0,
  foreign key (os_id, empresa_id) references public.ordens_servico(id, empresa_id) on delete cascade
);

-- ---------- Meu Assessor (envelopes) ----------
create table public.envelopes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome text not null,
  pct numeric(5,2) not null default 0,
  categoria text not null,              -- categoria de gasto que sai deste envelope
  ordem integer not null default 0
);

-- ---------- Assinatura / teste grátis (só o servidor escreve) ----------
create table public.assinaturas (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','ativo','vencido','cancelado','gratis')),
  trial_ate timestamptz not null default (now() + interval '3 days'),
  pago_ate timestamptz,
  acesso_gratis boolean not null default false,
  asaas_customer_id text,
  asaas_subscription_id text,
  created_at timestamptz not null default now()
);
create index assinaturas_customer_idx on public.assinaturas (asaas_customer_id);
create index assinaturas_subscription_idx on public.assinaturas (asaas_subscription_id);

-- true = acesso liberado | false = bloqueado | null = usuário ainda sem empresa
create or replace function public.acesso_liberado()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select a.acesso_gratis
      or a.trial_ate > now()
      or coalesce(a.pago_ate, 'epoch'::timestamptz) > now()
  from public.assinaturas a
  where a.empresa_id = public.empresa_atual()
$$;

-- Numeração sequencial por empresa (Orçamento #0001, OS #0001...)
create or replace function public.definir_numero()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext(tg_table_name || new.empresa_id::text));
    execute format('select coalesce(max(numero), 0) + 1 from public.%I where empresa_id = $1', tg_table_name)
      into new.numero using new.empresa_id;
  end if;
  return new;
end $$;
create trigger numero_orcamento before insert on public.orcamentos for each row execute function public.definir_numero();
create trigger numero_os before insert on public.ordens_servico for each row execute function public.definir_numero();

-- =========================================================
-- RLS: cada usuário só enxerga/altera dados da própria empresa
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'config','materiais','produtos','precos','pedidos','pagamentos','gastos',
    'despesas_fixas','orcamentos','orcamento_itens','ordens_servico','os_itens','envelopes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy tenant_select on public.%I for select to authenticated
         using (empresa_id in (select public.minhas_empresas()))', t);
    execute format(
      'create policy tenant_insert on public.%I for insert to authenticated
         with check (empresa_id in (select public.minhas_empresas()) and (select public.acesso_liberado()))', t);
    execute format(
      'create policy tenant_update on public.%I for update to authenticated
         using (empresa_id in (select public.minhas_empresas()) and (select public.acesso_liberado()))
         with check (empresa_id in (select public.minhas_empresas()) and (select public.acesso_liberado()))', t);
    execute format(
      'create policy tenant_delete on public.%I for delete to authenticated
         using (empresa_id in (select public.minhas_empresas()) and (select public.acesso_liberado()))', t);
    if t <> 'config' and t <> 'precos' then
      execute format('create index on public.%I (empresa_id)', t);
    end if;
  end loop;
end $$;

-- empresas: membro lê e edita a própria (criação só pela função criar_empresa)
alter table public.empresas enable row level security;
create policy empresa_select on public.empresas for select to authenticated
  using (id in (select public.minhas_empresas()));
create policy empresa_update on public.empresas for update to authenticated
  using (id in (select public.minhas_empresas()))
  with check (id in (select public.minhas_empresas()));

-- membros: só leitura do próprio vínculo (escrita só via função)
alter table public.assinaturas enable row level security;
create policy assinatura_select on public.assinaturas for select to authenticated
  using (empresa_id in (select public.minhas_empresas()));

alter table public.membros enable row level security;
create policy membros_select on public.membros for select to authenticated
  using (user_id = auth.uid());

-- =========================================================
-- Cadastro: cria empresa + vínculo + padrões editáveis (sem dados de negócio)
-- =========================================================
create or replace function public.criar_empresa(p_nome text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'informe o nome da empresa'; end if;
  if exists (select 1 from public.membros where user_id = auth.uid()) then
    raise exception 'usuário já possui empresa';
  end if;

  insert into public.empresas (nome) values (trim(p_nome)) returning id into v_id;
  insert into public.membros (empresa_id, user_id, papel) values (v_id, auth.uid(), 'dono');
  insert into public.config (empresa_id) values (v_id);
  insert into public.assinaturas (empresa_id) values (v_id);  -- teste grátis de 3 dias

  insert into public.envelopes (empresa_id, nome, pct, categoria, ordem) values
    (v_id, 'Material', 30, 'Material', 1),
    (v_id, 'Tráfego', 20, 'Anúncios (Ads)', 2),
    (v_id, 'Pró-labore', 30, 'Pró-labore', 3),
    (v_id, 'Caixa da empresa', 20, 'Caixa da empresa', 4);

  return v_id;
end $$;

-- =========================================================
-- Permissões: anon (chave pública) não acessa NADA
-- =========================================================
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, delete on public.empresas, public.membros from authenticated;
revoke insert, update, delete on public.assinaturas from authenticated;  -- só o servidor (service_role) escreve
revoke update on public.membros from authenticated;
grant execute on function public.minhas_empresas() to authenticated;
grant execute on function public.empresa_atual() to authenticated;
grant execute on function public.acesso_liberado() to authenticated;
grant execute on function public.criar_empresa(text) to authenticated;

-- =========================================================
-- Storage: logos (privado; cada empresa só mexe na própria pasta)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png','image/jpeg'])
on conflict (id) do nothing;

create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas()));
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas()));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas()));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas()));

-- ==========================================================
-- EQUIPE (aplicada por cima do que está acima; pode rodar de novo sem problema)
-- ==========================================================

-- ---------- 1) colunas novas ----------
alter table public.assinaturas add column if not exists assentos_extra integer not null default 0 check (assentos_extra >= 0);
alter table public.membros add column if not exists nome text;
alter table public.membros add column if not exists email text;
update public.membros m set email = u.email from auth.users u where u.id = m.user_id and m.email is null;

-- ---------- 2) papel do usuário ----------
create or replace function public.minhas_empresas_dono()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select empresa_id from public.membros where user_id = auth.uid() and papel = 'dono'
$$;

create or replace function public.meu_papel()
returns text
language sql stable security definer
set search_path = ''
as $$
  select papel from public.membros where user_id = auth.uid() limit 1
$$;

-- usado pelo middleware: 1 chamada traz acesso + papel
create or replace function public.contexto_acesso()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object('liberado', public.acesso_liberado(), 'papel', public.meu_papel())
$$;

revoke execute on function public.minhas_empresas_dono() from anon, public;
revoke execute on function public.meu_papel() from anon, public;
revoke execute on function public.contexto_acesso() from anon, public;
grant execute on function public.minhas_empresas_dono() to authenticated;
grant execute on function public.meu_papel() to authenticated;
grant execute on function public.contexto_acesso() to authenticated;

-- ---------- 3) tabelas de negócio: SÓ o dono (funcionário não lê nem escreve nada aqui) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'config','materiais','produtos','precos','pedidos','pagamentos','gastos',
    'despesas_fixas','orcamentos','orcamento_itens','ordens_servico','os_itens','envelopes'
  ] loop
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format('drop policy if exists tenant_select on public.%I', t);
    execute format('drop policy if exists tenant_insert on public.%I', t);
    execute format('drop policy if exists tenant_update on public.%I', t);
    execute format('drop policy if exists tenant_delete on public.%I', t);
    execute format(
      'create policy tenant_select on public.%I for select to authenticated
         using (empresa_id in (select public.minhas_empresas_dono()))', t);
    execute format(
      'create policy tenant_insert on public.%I for insert to authenticated
         with check (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()))', t);
    execute format(
      'create policy tenant_update on public.%I for update to authenticated
         using (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()))
         with check (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()))', t);
    execute format(
      'create policy tenant_delete on public.%I for delete to authenticated
         using (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()))', t);
  end loop;
end $$;

-- empresa: todos os membros leem (nome e logo); só o dono altera
drop policy if exists empresa_update on public.empresas;
create policy empresa_update on public.empresas for update to authenticated
  using (id in (select public.minhas_empresas_dono()))
  with check (id in (select public.minhas_empresas_dono()));

-- membros: cada um vê o próprio vínculo; o dono vê a equipe toda
drop policy if exists membros_select on public.membros;
create policy membros_select on public.membros for select to authenticated
  using (user_id = auth.uid() or empresa_id in (select public.minhas_empresas_dono()));

-- assinatura/cobrança: só o dono vê
drop policy if exists assinatura_select on public.assinaturas;
create policy assinatura_select on public.assinaturas for select to authenticated
  using (empresa_id in (select public.minhas_empresas_dono()));

-- ---------- 4) convites (quem cria é o servidor; o dono lê e cancela) ----------
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  nome text,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days'),
  usado_em timestamptz,
  usado_por uuid references auth.users(id) on delete set null
);
create index if not exists convites_empresa_idx on public.convites (empresa_id);
alter table public.convites enable row level security;
drop policy if exists convites_select on public.convites;
drop policy if exists convites_delete on public.convites;
create policy convites_select on public.convites for select to authenticated
  using (empresa_id in (select public.minhas_empresas_dono()));
create policy convites_delete on public.convites for delete to authenticated
  using (empresa_id in (select public.minhas_empresas_dono()) and usado_em is null);
revoke all on public.convites from anon, authenticated;
grant select, delete on public.convites to authenticated;

-- ---------- 5) arquivos de layout das OS ----------
create table if not exists public.os_arquivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  os_id uuid not null,
  nome text not null,
  path text not null,
  mime text not null,
  tamanho integer,
  created_at timestamptz not null default now(),
  foreign key (os_id, empresa_id) references public.ordens_servico(id, empresa_id) on delete cascade
);
create index if not exists os_arquivos_os_idx on public.os_arquivos (os_id);
alter table public.os_arquivos enable row level security;
drop policy if exists os_arquivos_select on public.os_arquivos;
drop policy if exists os_arquivos_insert on public.os_arquivos;
drop policy if exists os_arquivos_delete on public.os_arquivos;
create policy os_arquivos_select on public.os_arquivos for select to authenticated
  using (empresa_id in (select public.minhas_empresas()));
create policy os_arquivos_insert on public.os_arquivos for insert to authenticated
  with check (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()));
create policy os_arquivos_delete on public.os_arquivos for delete to authenticated
  using (empresa_id in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()));
revoke all on public.os_arquivos from anon;
grant select, insert, delete on public.os_arquivos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('layouts', 'layouts', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists layouts_select on storage.objects;
drop policy if exists layouts_insert on storage.objects;
drop policy if exists layouts_delete on storage.objects;
create policy layouts_select on storage.objects for select to authenticated
  using (bucket_id = 'layouts' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas()));
create policy layouts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'layouts' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas_dono()) and (select public.acesso_liberado()));
create policy layouts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'layouts' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas_dono()));

-- logos: todos veem, só o dono troca
drop policy if exists logos_insert on storage.objects;
drop policy if exists logos_update on storage.objects;
drop policy if exists logos_delete on storage.objects;
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas_dono()));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas_dono()));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1]::uuid in (select public.minhas_empresas_dono()));

-- ---------- 6) visão de produção: o funcionário só enxerga isto (SEM valores, telefone ou pagamento) ----------
create or replace function public.producao_os()
returns table (id uuid, numero integer, cliente text, data date, prazo_entrega date, status text, observacoes text)
language sql stable security definer
set search_path = ''
as $$
  select o.id, o.numero, o.cliente, o.data, o.prazo_entrega, o.status, o.observacoes
  from public.ordens_servico o
  where o.empresa_id = public.empresa_atual() and o.status <> 'entregue'
  order by o.prazo_entrega nulls last, o.numero
$$;

create or replace function public.producao_itens()
returns table (id uuid, os_id uuid, servico text, descricao text, quantidade integer, ordem integer)
language sql stable security definer
set search_path = ''
as $$
  select i.id, i.os_id, i.servico, i.descricao, i.quantidade, i.ordem
  from public.os_itens i
  join public.ordens_servico o on o.id = i.os_id and o.empresa_id = i.empresa_id
  where i.empresa_id = public.empresa_atual() and o.status <> 'entregue'
  order by i.ordem
$$;

-- funcionário só move a OS entre aberta / produção / pronta (entregar e cobrar é do dono)
create or replace function public.os_mudar_status(p_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_status not in ('aberta', 'producao', 'pronta') then raise exception 'status inválido'; end if;
  if not coalesce(public.acesso_liberado(), false) then raise exception 'acesso suspenso'; end if;
  update public.ordens_servico set status = p_status
   where id = p_id and empresa_id = public.empresa_atual() and status <> 'entregue';
  if not found then raise exception 'OS não encontrada'; end if;
end $$;

-- ---------- 7) convites: aceitar, consultar, remover membro ----------
create or replace function public.convite_info(p_token text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select e.nome from public.convites c join public.empresas e on e.id = c.empresa_id
  where c.token = p_token and c.usado_em is null and c.expira_em > now()
$$;

create or replace function public.aceitar_convite(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare c record; v_equipe integer; v_extra integer;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if exists (select 1 from public.membros where user_id = auth.uid()) then
    raise exception 'esta conta já pertence a uma empresa';
  end if;
  select * into c from public.convites where token = p_token for update;
  if not found or c.usado_em is not null or c.expira_em < now() then
    raise exception 'convite inválido ou expirado';
  end if;
  select count(*) into v_equipe from public.membros where empresa_id = c.empresa_id and papel = 'equipe';
  select assentos_extra into v_extra from public.assinaturas where empresa_id = c.empresa_id;
  if v_equipe >= 1 + coalesce(v_extra, 0) then raise exception 'a empresa não tem vaga para mais funcionários'; end if;
  insert into public.membros (empresa_id, user_id, papel, nome, email)
  values (c.empresa_id, auth.uid(), 'equipe', c.nome, auth.jwt() ->> 'email');
  update public.convites set usado_em = now(), usado_por = auth.uid() where id = c.id;
  return c.empresa_id;
end $$;

create or replace function public.remover_membro(p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.membros
   where user_id = p_user and papel = 'equipe' and empresa_id in (select public.minhas_empresas_dono());
  if not found then raise exception 'funcionário não encontrado'; end if;
end $$;

revoke execute on function public.producao_os() from anon, public;
revoke execute on function public.producao_itens() from anon, public;
revoke execute on function public.os_mudar_status(uuid, text) from anon, public;
revoke execute on function public.aceitar_convite(text) from anon, public;
revoke execute on function public.remover_membro(uuid) from anon, public;
revoke execute on function public.convite_info(text) from public;
grant execute on function public.producao_os() to authenticated;
grant execute on function public.producao_itens() to authenticated;
grant execute on function public.os_mudar_status(uuid, text) to authenticated;
grant execute on function public.aceitar_convite(text) to authenticated;
grant execute on function public.remover_membro(uuid) to authenticated;
grant execute on function public.convite_info(text) to anon, authenticated;

-- ---------- 8) cadastro do dono já guarda o e-mail ----------
create or replace function public.criar_empresa(p_nome text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'informe o nome da empresa'; end if;
  if exists (select 1 from public.membros where user_id = auth.uid()) then
    raise exception 'usuário já possui empresa';
  end if;

  insert into public.empresas (nome) values (trim(p_nome)) returning id into v_id;
  insert into public.membros (empresa_id, user_id, papel, email) values (v_id, auth.uid(), 'dono', auth.jwt() ->> 'email');
  insert into public.config (empresa_id) values (v_id);
  insert into public.assinaturas (empresa_id) values (v_id);

  insert into public.envelopes (empresa_id, nome, pct, categoria, ordem) values
    (v_id, 'Material', 30, 'Material', 1),
    (v_id, 'Tráfego', 20, 'Anúncios (Ads)', 2),
    (v_id, 'Pró-labore', 30, 'Pró-labore', 3),
    (v_id, 'Caixa da empresa', 20, 'Caixa da empresa', 4);

  return v_id;
end $$;
revoke execute on function public.criar_empresa(text) from anon, public;
grant execute on function public.criar_empresa(text) to authenticated;
