-- =========================================================
-- Equipe: dono x funcionário, convites, arquivos de layout e vagas pagas
-- Rode inteiro no SQL Editor. Pode rodar mais de uma vez.
-- =========================================================
set client_min_messages = warning;

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
