-- Prolar veritabanı kurulumu
-- Peengo ile aynı Supabase projesinde çalışır. Peengo'nun tablolarına dokunmaz, her şey prolar_ ile başlar.
-- Supabase > SQL Editor > New query: bu dosyanın tamamını yapıştır ve Run'a bas.
-- Tekrar çalıştırmak güvenlidir, var olan veriyi silmez.

create extension if not exists pgcrypto with schema extensions;

-- Oyuncular: kullanıcı adı benzersiz (büyük/küçük harf fark etmez), şifre sadece bcrypt ile şifrelenmiş hâliyle tutulur.
-- save: oyuncunun kaydı (altın, envanter, kuşanılanlar, açılan bölümler, market durumu).
create table if not exists public.prolar_players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 16),
  pass_hash text not null,
  is_admin boolean not null default false,
  save jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create unique index if not exists prolar_players_name_lower_idx on public.prolar_players (lower(name));

-- Giriş oturumları: her cihaz bir kere giriş yapar, token o cihazda saklanır.
create table if not exists public.prolar_sessions (
  token uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.prolar_players(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tablolara dışarıdan doğrudan erişim yok. Her şey aşağıdaki fonksiyonlardan geçer.
alter table public.prolar_players enable row level security;
alter table public.prolar_sessions enable row level security;
revoke all on public.prolar_players, public.prolar_sessions from anon, authenticated;

-- Token kimin?
create or replace function public.prolar_pid(p_token uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select player_id from prolar_sessions where token = p_token
$$;

-- Hesap aç
create or replace function public.prolar_register(p_name text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid; v_token uuid;
begin
  if v_name !~ '^[A-Za-z0-9_çğıöşüÇĞİÖŞÜ]{3,16}$' then
    raise exception 'Kullanıcı adı 3-16 karakter olmalı. Harf, rakam ve _ kullanabilirsin.';
  end if;
  if char_length(coalesce(p_pass, '')) < 4 then raise exception 'Şifre en az 4 karakter olmalı.'; end if;
  if char_length(p_pass) > 72 then raise exception 'Şifre en fazla 72 karakter olabilir.'; end if;
  if exists (select 1 from prolar_players where lower(name) = lower(v_name)) then
    raise exception 'Bu kullanıcı adı alınmış. Başka bir isim yaz.';
  end if;
  -- "admin" adıyla açılan hesap test hesabıdır: bütün bölümler ve eşyalar açık gelir. Başka hesaplara erişemez.
  insert into prolar_players(name, pass_hash, is_admin) values (v_name, crypt(p_pass, gen_salt('bf')), lower(v_name) = 'admin') returning id into v_id;
  insert into prolar_sessions(player_id) values (v_id) returning token into v_token;
  return json_build_object('token', v_token, 'id', v_id, 'name', v_name, 'is_admin', lower(v_name) = 'admin', 'save', '{}'::jsonb);
exception when unique_violation then
  raise exception 'Bu kullanıcı adı az önce alındı. Başka bir isim yaz.';
end $$;

-- Giriş yap (kullanıcı adı büyük/küçük harf fark etmez)
create or replace function public.prolar_login(p_name text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_p prolar_players; v_token uuid;
begin
  select * into v_p from prolar_players
   where lower(name) = lower(btrim(coalesce(p_name, '')))
     and pass_hash = crypt(coalesce(p_pass, ''), pass_hash);
  if v_p.id is null then
    perform pg_sleep(0.6);
    raise exception 'Kullanıcı adı ya da şifre yanlış.';
  end if;
  insert into prolar_sessions(player_id) values (v_p.id) returning token into v_token;
  update prolar_players set last_seen = now() where id = v_p.id;
  return json_build_object('token', v_token, 'id', v_p.id, 'name', v_p.name, 'is_admin', v_p.is_admin, 'save', v_p.save);
end $$;

-- Kayıtlı cihaz: oturumu ve kaydı getir
create or replace function public.prolar_me(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_p prolar_players;
begin
  select p.* into v_p from prolar_sessions s join prolar_players p on p.id = s.player_id where s.token = p_token;
  if v_p.id is null then raise exception 'Oturumun kapanmış. Tekrar giriş yap.'; end if;
  update prolar_players set last_seen = now() where id = v_p.id;
  return json_build_object('id', v_p.id, 'name', v_p.name, 'is_admin', v_p.is_admin, 'save', v_p.save);
end $$;

-- Kaydı yaz (en fazla 256 KB)
create or replace function public.prolar_save(p_token uuid, p_save jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_pid uuid := prolar_pid(p_token);
begin
  if v_pid is null then raise exception 'Oturumun kapanmış. Tekrar giriş yap.'; end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' then raise exception 'Geçersiz kayıt.'; end if;
  if pg_column_size(p_save) > 262144 then raise exception 'Kayıt çok büyük.'; end if;
  update prolar_players set save = p_save, updated_at = now(), last_seen = now() where id = v_pid;
  return true;
end $$;

-- Çıkış (sadece bu cihazın oturumu kapanır)
create or replace function public.prolar_logout(p_token uuid)
returns boolean language sql security definer set search_path = public as $$
  delete from prolar_sessions where token = p_token returning true
$$;

-- Şifre değiştir: mevcut şifreyi bilmek gerekir
create or replace function public.prolar_change_password(p_token uuid, p_old text, p_new text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_pid uuid; v_ok boolean;
begin
  select s.player_id, p.pass_hash = crypt(coalesce(p_old, ''), p.pass_hash) into v_pid, v_ok
    from prolar_sessions s join prolar_players p on p.id = s.player_id where s.token = p_token;
  if v_pid is null then raise exception 'Oturumun kapanmış. Tekrar giriş yap.'; end if;
  if not v_ok then perform pg_sleep(0.6); raise exception 'Şu anki şifren yanlış.'; end if;
  if char_length(coalesce(p_new, '')) < 4 then raise exception 'Yeni şifre en az 4 karakter olmalı.'; end if;
  if char_length(p_new) > 72 then raise exception 'Yeni şifre en fazla 72 karakter olabilir.'; end if;
  update prolar_players set pass_hash = crypt(p_new, gen_salt('bf')) where id = v_pid;
  return true;
end $$;

revoke execute on function public.prolar_pid(uuid) from public, anon, authenticated;
revoke execute on function public.prolar_register(text, text), public.prolar_login(text, text), public.prolar_me(uuid),
  public.prolar_save(uuid, jsonb), public.prolar_logout(uuid), public.prolar_change_password(uuid, text, text) from public;
grant execute on function public.prolar_register(text, text), public.prolar_login(text, text), public.prolar_me(uuid),
  public.prolar_save(uuid, jsonb), public.prolar_logout(uuid), public.prolar_change_password(uuid, text, text) to anon, authenticated;

-- Test hesabı: sitede "admin" kullanıcı adıyla hesap aç. Bu hesapta bütün bölümler ve eşyalar açık gelir.
-- Bu hesap sadece kendi kaydını değiştirebilir, başka oyuncuların hesaplarına erişemez.
update public.prolar_players set is_admin = true where lower(name) = 'admin';

select 'prolar hazir' as durum;
