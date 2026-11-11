-- Milestone 6: create_votes
-- הטבלה votes (קול אחד לכל משתמש לכל בדיחה), הנעילה, ושתי פונקציות: cast_vote ו-joke_feed.
-- רק service_role (הפונקציות ב-Vercel) ניגש. העמודה laughs והפונקציה add_laugh נשארות כמו שהן.

create table public.votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  joke_id uuid not null references public.jokes (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (user_id, joke_id)
);

create index votes_joke_id_idx on public.votes (joke_id);

-- הנעילה: RLS דולק בלי אף policy. רק service_role, ורק מה שצריך.
alter table public.votes enable row level security;

revoke all on table public.votes from anon, authenticated;
revoke all on table public.votes from service_role;
grant select, insert, update, delete on table public.votes to service_role;

-- הצבעה: 1 אהבתי, 1- לא אהבתי, 0 ביטול. כל ערך אחר: שגיאה.
-- בדיחה שלא קיימת: שגיאה P0002 (השרת מחזיר 404).
-- מחזירה שורה אחת: likes, dislikes ו-my_vote של הבדיחה, אחרי ההצבעה.
create function public.cast_vote(voter uuid, target uuid, new_value smallint)
returns table (likes integer, dislikes integer, my_vote smallint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if voter is null then
    raise exception 'voter is required' using errcode = '22004';
  end if;

  if new_value is null or new_value not in (-1, 0, 1) then
    raise exception 'invalid vote value' using errcode = '22023';
  end if;

  if not exists (select 1 from public.jokes j where j.id = target) then
    raise exception 'joke not found' using errcode = 'P0002';
  end if;

  if new_value = 0 then
    delete from public.votes v
    where v.user_id = voter and v.joke_id = target;
  else
    insert into public.votes as v (user_id, joke_id, value)
    values (voter, target, new_value)
    on conflict (user_id, joke_id) do update
      set value = excluded.value, voted_at = now();
  end if;

  return query
    select
      (count(*) filter (where v.value = 1))::integer,
      (count(*) filter (where v.value = -1))::integer,
      coalesce(max(v.value) filter (where v.user_id = voter), 0)::smallint
    from public.votes v
    where v.joke_id = target;
end;
$$;

-- רשימת בדיחות עם הספירה וההצבעה של מי שמסתכל. viewer הוא null לאורח.
-- new: מהחדשה. top: רק עם אהבתי אחד לפחות, לפי אהבתי פחות לא אהבתי, ואז לפי אהבתי.
-- liked: רק מה ש-viewer סימן בו 1, לפי זמן ההצבעה. max_rows בין 1 ל-50.
create function public.joke_feed(viewer uuid, mode text, max_rows integer default 20)
returns table (
  id uuid,
  created_at timestamptz,
  topic text,
  text text,
  author_name text,
  likes integer,
  dislikes integer,
  my_vote smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tally as (
    select
      v.joke_id,
      (count(*) filter (where v.value = 1))::integer as likes,
      (count(*) filter (where v.value = -1))::integer as dislikes
    from public.votes v
    group by v.joke_id
  ),
  mine as (
    select v.joke_id, v.value, v.voted_at
    from public.votes v
    where viewer is not null and v.user_id = viewer
  )
  select
    j.id,
    j.created_at,
    j.topic,
    j.text,
    j.author_name,
    coalesce(t.likes, 0),
    coalesce(t.dislikes, 0),
    coalesce(m.value, 0)::smallint
  from public.jokes j
  left join tally t on t.joke_id = j.id
  left join mine m on m.joke_id = j.id
  where case mode
    when 'new' then true
    when 'top' then coalesce(t.likes, 0) >= 1
    when 'liked' then m.value = 1
    else false
  end
  order by
    case when mode = 'liked' then m.voted_at end desc nulls last,
    case when mode = 'top' then coalesce(t.likes, 0) - coalesce(t.dislikes, 0) end desc nulls last,
    case when mode = 'top' then coalesce(t.likes, 0) end desc nulls last,
    j.created_at desc nulls last
  limit greatest(1, least(coalesce(max_rows, 20), 50));
$$;

-- הרשאות לפונקציות: רק service_role
revoke execute on function public.cast_vote(uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, smallint) to service_role;

revoke execute on function public.joke_feed(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.joke_feed(uuid, text, integer) to service_role;
