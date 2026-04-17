create extension if not exists pgcrypto;

create table if not exists app_users (
  id bigint generated always as identity primary key,
  name text not null,
  username text not null unique,
  email text unique,
  uid text unique,
  avatar_data_url text,
  avatar_storage_path text,
  password_hash text not null,
  pin_hash text,
  role text not null check (role in ('admin', 'staff', 'student')) default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Settings page compatibility for existing databases
alter table app_users
add column if not exists name text default 'User';

update app_users
set name = 'User'
where name is null;

alter table app_users
alter column name set not null;

alter table app_users
add column if not exists username text;

alter table app_users
add column if not exists email text;

alter table app_users
add column if not exists avatar_data_url text;

alter table app_users
add column if not exists avatar_storage_path text;

alter table app_users
add column if not exists password_hash text;

alter table app_users
add column if not exists role text default 'staff';

update app_users
set role = 'staff'
where role is null;

alter table app_users
alter column role set default 'staff';

alter table app_users
drop constraint if exists app_users_role_check;

alter table app_users
add constraint app_users_role_check check (role in ('admin', 'staff', 'student'));

create unique index if not exists app_users_username_key on app_users (username);
create unique index if not exists app_users_email_key on app_users (email) where email is not null;
create unique index if not exists app_users_uid_key on app_users (uid) where uid is not null;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

create table if not exists attendance_records (
  id bigint generated always as identity primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  attendance_date date not null,
  time_in time,
  time_out time,
  status text not null check (status in ('Present', 'Late', 'Absent')) default 'Present',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

create index if not exists attendance_records_date_idx on attendance_records(attendance_date);

create table if not exists app_settings (
  id integer primary key check (id = 1),
  present_until time not null default '08:00:00',
  late_from time not null default '08:15:00',
  absent_from time not null default '10:00:00',
  scan_cooldown_seconds integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (present_until < late_from),
  check (late_from < absent_from),
  check (scan_cooldown_seconds >= 0)
);

insert into app_settings (id, present_until, late_from, absent_from, scan_cooldown_seconds)
values (1, '08:00:00', '08:15:00', '10:00:00', 60)
on conflict (id) do update
set
  present_until = excluded.present_until,
  late_from = excluded.late_from,
  absent_from = excluded.absent_from,
  scan_cooldown_seconds = excluded.scan_cooldown_seconds;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row
execute function set_updated_at();

drop trigger if exists attendance_records_set_updated_at on attendance_records;
create trigger attendance_records_set_updated_at
before update on attendance_records
for each row
execute function set_updated_at();

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at
before update on app_settings
for each row
execute function set_updated_at();

do $$
declare
  admin_user_id bigint;
  staff_user_id bigint;
  student_one_user_id bigint;
  student_two_user_id bigint;
begin
  select id
  into admin_user_id
  from app_users
  where username = 'admin'
     or email = 'admin@example.com'
     or uid = 'ADMIN001'
  order by
    case
      when username = 'admin' then 0
      when email = 'admin@example.com' then 1
      else 2
    end
  limit 1;

  if admin_user_id is null then
    insert into app_users (name, username, email, uid, password_hash, pin_hash, role)
    values (
      'System Administrator',
      'admin',
      'admin@example.com',
      'ADMIN001',
      crypt('admin', gen_salt('bf')),
      crypt('1234', gen_salt('bf')),
      'admin'
    );
  else
    update app_users
    set
      name = 'System Administrator',
      username = 'admin',
      email = 'admin@example.com',
      uid = 'ADMIN001',
      role = 'admin'
    where id = admin_user_id;
  end if;

  select id
  into staff_user_id
  from app_users
  where username = 'staff'
     or email = 'staff@example.com'
     or uid = 'STAFF001'
  order by
    case
      when username = 'staff' then 0
      when email = 'staff@example.com' then 1
      else 2
    end
  limit 1;

  if staff_user_id is null then
    insert into app_users (name, username, email, uid, password_hash, pin_hash, role)
    values (
      'Sample Staff',
      'staff',
      'staff@example.com',
      'STAFF001',
      crypt('staff123', gen_salt('bf')),
      crypt('4321', gen_salt('bf')),
      'staff'
    );
  else
    update app_users
    set
      name = 'Sample Staff',
      username = 'staff',
      email = 'staff@example.com',
      uid = 'STAFF001',
      role = 'staff'
    where id = staff_user_id;
  end if;

  select id
  into student_one_user_id
  from app_users
  where username = 'student1'
     or email = 'student1@example.com'
     or uid = 'STUDENT001'
  order by
    case
      when username = 'student1' then 0
      when email = 'student1@example.com' then 1
      else 2
    end
  limit 1;

  if student_one_user_id is null then
    insert into app_users (name, username, email, uid, password_hash, pin_hash, role)
    values (
      'Sample Student One',
      'student1',
      'student1@example.com',
      'STUDENT001',
      crypt('student123', gen_salt('bf')),
      crypt('1111', gen_salt('bf')),
      'student'
    );
  else
    update app_users
    set
      name = 'Sample Student One',
      username = 'student1',
      email = 'student1@example.com',
      uid = 'STUDENT001',
      role = 'student'
    where id = student_one_user_id;
  end if;

  select id
  into student_two_user_id
  from app_users
  where username = 'student2'
     or email = 'student2@example.com'
     or uid = 'STUDENT002'
  order by
    case
      when username = 'student2' then 0
      when email = 'student2@example.com' then 1
      else 2
    end
  limit 1;

  if student_two_user_id is null then
    insert into app_users (name, username, email, uid, password_hash, pin_hash, role)
    values (
      'Sample Student Two',
      'student2',
      'student2@example.com',
      'STUDENT002',
      crypt('student123', gen_salt('bf')),
      crypt('2222', gen_salt('bf')),
      'student'
    );
  else
    update app_users
    set
      name = 'Sample Student Two',
      username = 'student2',
      email = 'student2@example.com',
      uid = 'STUDENT002',
      role = 'student'
    where id = student_two_user_id;
  end if;
end $$;
