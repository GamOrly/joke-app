-- Milestone 4: create_jokes
-- הטבלה jokes, הנעילה, והפונקציה add_laugh. רק service_role (הפונקציות ב-Vercel) ניגש.

create table public.jokes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  topic text,
  text text not null,
  laughs integer not null default 0
);

-- הנעילה: RLS דולק בלי אף policy
alter table public.jokes enable row level security;

revoke all on table public.jokes from anon, authenticated;
grant select, insert, update on table public.jokes to service_role;

-- ספירת צחוקים בפקודה אחת, כדי ששתי לחיצות באותו רגע לא ידרסו זו את זו.
-- אין בדיחה עם ה-id הזה: מחזירה null.
create function public.add_laugh(joke_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.jokes
  set laughs = laughs + 1
  where id = joke_id
  returning laughs;
$$;

revoke execute on function public.add_laugh(uuid) from public, anon, authenticated;
grant execute on function public.add_laugh(uuid) to service_role;

-- migration שני, limit_service_role_grants: הפרויקט נותן ל-service_role את כל ההרשאות כברירת מחדל.
-- משאירים לו רק select, insert ו-update.
revoke delete, truncate, references, trigger on table public.jokes from service_role;
