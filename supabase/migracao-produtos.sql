-- =========================================================
-- Produtos e serviços (catálogo livre de cada empresa)
-- =========================================================
create table if not exists public.produtos (
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
create index if not exists produtos_empresa_idx on public.produtos (empresa_id);

alter table public.produtos enable row level security;
drop policy if exists tenant_isolation on public.produtos;
create policy tenant_isolation on public.produtos for all to authenticated
  using (empresa_id in (select public.minhas_empresas()))
  with check (empresa_id in (select public.minhas_empresas()));

revoke all on public.produtos from anon;
grant select, insert, update, delete on public.produtos to authenticated;
