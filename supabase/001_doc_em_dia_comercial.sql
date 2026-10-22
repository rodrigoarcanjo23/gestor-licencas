-- =====================================================================
-- DOC em dia — Migração 001: base comercial
-- Rode este arquivo INTEIRO no Supabase: SQL Editor > New query > Run.
-- Pode ser executado mais de uma vez sem duplicar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) CONFERÊNCIA (opcional, rode antes): documentos sem dono somem
--    da tela depois que a segurança (RLS) for ativada.
--
--    select count(*) from public.documents where user_id is null;
--
--    Se o número for maior que zero, descubra o id da conta certa em
--    Authentication > Users e rode:
--    update public.documents set user_id = 'COLE-O-ID-AQUI' where user_id is null;
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) EMPRESAS
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  cnpj          text,
  contact_name  text,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz not null default now()
);

create unique index if not exists companies_user_name_uidx
  on public.companies (user_id, lower(name));

-- ---------------------------------------------------------------------
-- 2) NOVAS COLUNAS EM DOCUMENTOS
-- ---------------------------------------------------------------------
alter table public.documents alter column user_id set default auth.uid();

alter table public.documents add column if not exists company_id      uuid references public.companies (id) on delete set null;
alter table public.documents add column if not exists file_path       text;
alter table public.documents add column if not exists file_name       text;
alter table public.documents add column if not exists renewal_status  text;
alter table public.documents add column if not exists renewal_history jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists updated_at      timestamptz default now();

do $$ begin
  alter table public.documents add constraint documents_renewal_status_chk
    check (renewal_status is null or renewal_status in ('em_renovacao', 'protocolado', 'aguardando_vistoria'));
exception when duplicate_object then null; end $$;

create index if not exists documents_user_expiry_idx on public.documents (user_id, expiry_date);
create index if not exists documents_company_idx     on public.documents (company_id);

-- ---------------------------------------------------------------------
-- 3) CONFIGURAÇÕES POR USUÁRIO
-- ---------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  office_name        text,
  report_name        text,
  report_email       text,
  report_whatsapp    text,
  alert_days         int  not null default 30 check (alert_days between 1 and 365),
  email_enabled      boolean not null default true,
  notify_mode        text not null default 'etapas' check (notify_mode in ('etapas', 'diario')),
  notify_steps       int[] not null default '{60,30,15,7,0}',
  category_validity  jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4) SEGURANÇA (RLS): cada usuário vê e altera somente o que é dele
--    Remove políticas antigas de documents (podiam liberar tudo)
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('documents', 'companies', 'user_settings')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.documents     enable row level security;
alter table public.companies     enable row level security;
alter table public.user_settings enable row level security;

create policy "documents: dono" on public.documents
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "companies: dono" on public.companies
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "user_settings: dono" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5) ANEXOS (Storage): bucket privado, pasta = id do usuário
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anexos: ler os seus"     on storage.objects;
drop policy if exists "anexos: enviar os seus"  on storage.objects;
drop policy if exists "anexos: alterar os seus" on storage.objects;
drop policy if exists "anexos: apagar os seus"  on storage.objects;

create policy "anexos: ler os seus" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: enviar os seus" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: alterar os seus" on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: apagar os seus" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 6) MIGRAÇÃO: cria as empresas a partir dos documentos já cadastrados
-- ---------------------------------------------------------------------
insert into public.companies (user_id, name)
select distinct on (d.user_id, lower(trim(d.title))) d.user_id, trim(d.title)
from public.documents d
where d.user_id is not null and coalesce(trim(d.title), '') <> ''
on conflict (user_id, lower(name)) do nothing;

update public.documents d
set company_id = c.id
from public.companies c
where d.company_id is null
  and c.user_id = d.user_id
  and lower(c.name) = lower(trim(d.title));

-- Pronto! Confira: select name, (select count(*) from documents d where d.company_id = c.id) from companies c;
