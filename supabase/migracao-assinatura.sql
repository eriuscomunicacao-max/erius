-- =========================================================
-- Assinatura + teste grátis de 3 dias (migração para banco já criado)
-- Rode inteiro no SQL Editor. Pode rodar mais de uma vez.
-- =========================================================
set client_min_messages = warning;

create table if not exists public.assinaturas (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','ativo','vencido','cancelado','gratis')),
  trial_ate timestamptz not null default (now() + interval '3 days'),
  pago_ate timestamptz,
  acesso_gratis boolean not null default false,
  asaas_customer_id text,
  asaas_subscription_id text,
  created_at timestamptz not null default now()
);
create index if not exists assinaturas_customer_idx on public.assinaturas (asaas_customer_id);
create index if not exists assinaturas_subscription_idx on public.assinaturas (asaas_subscription_id);

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

-- Empresas que já existem ganham 3 dias de teste a partir de agora
insert into public.assinaturas (empresa_id) select id from public.empresas on conflict do nothing;

alter table public.assinaturas enable row level security;
drop policy if exists assinatura_select on public.assinaturas;
create policy assinatura_select on public.assinaturas for select to authenticated
  using (empresa_id in (select public.minhas_empresas()));

revoke all on public.assinaturas from anon;
revoke all on public.assinaturas from authenticated;
grant select on public.assinaturas to authenticated;   -- só leitura; quem escreve é o servidor
grant execute on function public.acesso_liberado() to authenticated;
revoke execute on function public.acesso_liberado() from anon, public;

-- Políticas: leitura sempre; escrita só com acesso liberado (teste ou pago)
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
  end loop;
end $$;

-- Cadastro passa a criar também o teste grátis
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

revoke execute on function public.criar_empresa(text) from anon, public;
grant execute on function public.criar_empresa(text) to authenticated;
