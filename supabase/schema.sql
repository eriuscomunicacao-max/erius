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
    'config','materiais','precos','pedidos','pagamentos','gastos',
    'despesas_fixas','orcamentos','orcamento_itens','ordens_servico','os_itens','envelopes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated
         using (empresa_id in (select public.minhas_empresas()))
         with check (empresa_id in (select public.minhas_empresas()))', t);
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
revoke update on public.membros from authenticated;
grant execute on function public.minhas_empresas() to authenticated;
grant execute on function public.empresa_atual() to authenticated;
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
