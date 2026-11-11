-- Milestone 5: מי כתב את הבדיחה. שתי עמודות לא חובה, כי אורח לא מחובר.
-- הנעילה של הטבלה לא משתנה: ה-grant ל-service_role הוא על כל הטבלה, ולכן מכסה גם את העמודות החדשות.

alter table public.jokes
  add column user_id uuid references auth.users (id) on delete set null,
  add column author_name text;

alter table public.jokes
  add constraint jokes_author_name_length
  check (author_name is null or char_length(btrim(author_name)) between 1 and 30);

create index jokes_user_id_idx on public.jokes (user_id);
