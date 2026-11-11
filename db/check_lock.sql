-- בודק הנעילה: שאילתת קריאה בלבד, לא משנה כלום.
-- מריצים ב-Supabase, ב-SQL Editor. לכל טבלה ולכל פונקציה ב-public: "נעול" או "פתוח", ולמה.
--
-- טבלה נעולה: RLS דולק, אין אף policy, ול-anon ול-authenticated אין שום הרשאה, גם לא על עמודה.
-- פונקציה נעולה: security invoker, search_path ריק, ול-anon ול-authenticated אין הרשאת execute.

select
  'טבלה' as kind,
  c.relname as name,
  case
    when c.relrowsecurity
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
      and not has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
      and not has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger')
      and not has_any_column_privilege('anon', c.oid, 'select, insert, update, references')
      and not has_any_column_privilege('authenticated', c.oid, 'select, insert, update, references')
    then 'נעול'
    else 'פתוח'
  end as status,
  concat_ws(', ',
    case when not c.relrowsecurity then 'RLS כבוי' end,
    case when exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) then 'יש policy' end,
    case when has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
           or has_any_column_privilege('anon', c.oid, 'select, insert, update, references') then 'ל-anon יש הרשאה' end,
    case when has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger')
           or has_any_column_privilege('authenticated', c.oid, 'select, insert, update, references') then 'ל-authenticated יש הרשאה' end
  ) as why_open
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')

union all

select
  'פונקציה',
  p.proname,
  case
    when not p.prosecdef
      and coalesce(p.proconfig, '{}') && array['search_path=""', 'search_path=']
      and not has_function_privilege('anon', p.oid, 'execute')
      and not has_function_privilege('authenticated', p.oid, 'execute')
    then 'נעול'
    else 'פתוח'
  end,
  concat_ws(', ',
    case when p.prosecdef then 'security definer' end,
    case when not (coalesce(p.proconfig, '{}') && array['search_path=""', 'search_path=']) then 'search_path לא ריק' end,
    case when has_function_privilege('anon', p.oid, 'execute') then 'ל-anon יש execute' end,
    case when has_function_privilege('authenticated', p.oid, 'execute') then 'ל-authenticated יש execute' end
  )
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'

order by 1 desc, 2;
