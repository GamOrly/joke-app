# Milestone 4: האפליקציה זוכרת

## המטרה
כל בדיחת AI נשמרת ב-Supabase, אפשר לסמן "צחקתי", ובדף יש רשימת "הכי מצחיקות".

## החלטות
- בלי נתוני דוגמה בטבלה. הרשימה ריקה עד הצחוק הראשון.
- הדף מדבר רק עם /api. רק הפונקציות בתיקייה api מדברות עם Supabase, דרך lib/supabase.js.
- "צחקתי" ננעל בדף בלבד. רענון מאפשר לצחוק שוב, כי אין זיהוי משתמש.
- השמירה נכשלה: הבדיחה מוצגת בלי כפתור "צחקתי", כי אין לה id.
- הבדיקה: בכתובת של Vercel, אחרי push, כמו ב-Milestone 3. (לאשר)

## הסדר
1. **Supabase**: בוחרים פרויקט (יותר מאחד? שואלים). כותבים את db/create_jokes.sql ומציגים אותו. **עצירה**: מריצים רק אחרי אישור.
2. מריצים את ה-migration `create_jokes`, ואז `get_advisors`. הסבר בעברית. **עצירה**: את בודקת שהטבלה נעולה.
3. **הקוד**: `npm install @supabase/supabase-js`, ‏lib/supabase.js, שלוש הפונקציות, והדף.
4. **עצירה לפני push**: את מוסיפה ב-Vercel את SUPABASE_URL ואת SUPABASE_SECRET_KEY.
5. push, Redeploy אם צריך, והלינק החי. בדיקה לפי תנאי ההשלמה ב-MILESTONES.md.

## ה-SQL (db/create_jokes.sql)
```sql
create table public.jokes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  topic text,
  text text not null,
  laughs integer not null default 0
);

alter table public.jokes enable row level security;

revoke all on table public.jokes from anon, authenticated;
grant select, insert, update on table public.jokes to service_role;

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
```
- העדכון הוא פקודה אחת, ולכן שתי לחיצות באותו רגע לא דורסות זו את זו.
- אין בדיחה עם ה-id הזה: הפונקציה מחזירה null, והשרת מחזיר 404.

## הקבצים
| הקובץ | מה בו |
|---|---|
| `package.json` | ב-dependencies: `@supabase/supabase-js`. נוסף גם package-lock.json |
| `lib/supabase.js` | פונקציה `getSupabase()` שיוצרת לקוח אחד ושומרת אותו. הכתובת מ-`process.env.SUPABASE_URL`, המפתח מ-`process.env.SUPABASE_SECRET_KEY`, ו-`auth: { persistSession: false }`. משתנה חסר: זורקת שגיאה, אבל רק כשקוראים לה, כדי ש-api/joke.js לא תיפול |
| `api/joke.js` | אחרי שהבדיחה התקבלה: insert של topic ו-text, ו-select של id. מחזירה `{ joke, id }`. כל כשל בשמירה: console.error, ו-`{ joke }` בלי id |
| `api/laugh.js` | רק POST. ‏`{ "id": "..." }` נבדק מול תבנית של uuid, אחרת 400. ‏`rpc("add_laugh", { joke_id })`. מחזירה `{ laughs }`, ‏404 אם אין בדיחה כזו, ו-500 בשגיאה |
| `api/top.js` | רק GET. ‏`laughs >= 1`, ממוינות לפי laughs ואז created_at, מהגבוה לנמוך, עד 5. מחזירה `{ jokes: [{ id, topic, text, laughs }] }`, עם `Cache-Control: no-store` |
| `index.html` | הכפתור "צחקתי" בבועה, ורשימת "הכי מצחיקות" מתחתיה |
| `sw.js` | כבר עודכן ל-`joke-v2`. ‏/api לא נשמר במטמון, כמו קודם |

## הדף
- "צחקתי":
  - מופיע בבועה מתחת לבדיחה, רק במצב בדיחה ורק כשיש id.
  - גלולה קטנה, נייר עם מסגרת 3 בצבע הדיו וצל קשה 4 על 4. הטקסט: "צחקתי · 0". הגופן Fredoka 600 בגודל 18, וגובה 44 לפחות.
  - לחיצה: הכפתור ננעל מיד, POST ל-/api/laugh, והמונה מתעדכן למספר שחזר. הכפתור נעשה מנטה, יורד למטה, והצל מתקצר.
  - שגיאה: הכפתור נפתח שוב, ושורה קטנה באדום של השגיאה: "הצחוק לא נשמר. נסו שוב."
  - בדיחה חדשה: כפתור חדש, פתוח, עם 0.
- "הכי מצחיקות":
  - מתחת לבועה. כותרת "הכי מצחיקות" ב-Fredoka 700 בגודל 22.
  - רשימה ממוספרת. כל בדיחה בכרטיס נייר עם פינות 18, מסגרת 3 וצל 4 על 4, מסובב קצת לסירוגין.
  - בכרטיס: הבדיחה ב-Playpen Sans Hebrew בגודל 18, ומתחת שורה בדיו רך עם הנושא (או "בלי נושא") ומספר הצחוקים.
  - רשימה ריקה: "עוד אין כאן בדיחות. צחקו על בדיחה, והיא תופיע כאן."
  - נטענת בפתיחת הדף, ושוב אחרי כל צחוק שנשמר. בלי polling.
  - שגיאה בטעינה: "הרשימה לא נטענה כרגע."
  - כל הטקסט מוצג עם textContent. לרשימה יש aria-live="polite".

## ביד, אצלך
- לחבר את המחבר של Supabase ל-Claude, אם הוא עוד לא מחובר.
- ב-Vercel, ב-Environment Variables, בסביבות Production ו-Preview:
  - `SUPABASE_URL`: כתובת הפרויקט, מסוג Config. היא מופיעה ב-Supabase, ב-Project Settings ואז Data API.
  - `SUPABASE_SECRET_KEY`: מפתח מסוג secret (מתחיל ב-sb_secret_), מסוג Secret. הוא מופיע ב-Supabase, ב-Project Settings ואז API Keys.
- מי שמריץ מקומית: להוסיף את שניהם ל-.env.local.

## מה נבנה בפועל
- Supabase, בפרויקט joke-app (היחיד בחשבון): רצו שני migrations.
  - `create_jokes`: לפי ה-SQL למעלה.
  - `limit_service_role_grants`: הפרויקט נתן ל-service_role את כל ההרשאות על הטבלה כברירת מחדל, כולל DELETE ו-TRUNCATE. ה-migration הזה מוריד אותן. השורה נוספה גם לסוף db/create_jokes.sql.
- נבדק אחרי ה-migrations: ‏RLS דולק עם 0 policies. ל-anon ול-authenticated אין הרשאות על הטבלה ועל add_laugh. ל-service_role יש רק SELECT, ‏INSERT ו-UPDATE, ו-EXECUTE על add_laugh.
- `get_advisors`: באבטחה הערת INFO אחת, `rls_enabled_no_policy`, וזה מכוון. בביצועים אין הערות.
- נבדק ב-SQL, כ-service_role, בתוך טרנזקציה שבוטלה בסוף: ‏insert עובד, ‏add_laugh מחזירה 1, ו-id שלא קיים מחזיר null. הטבלה נשארה ריקה.
- הקוד נבנה לפי טבלת הקבצים: ‏`@supabase/supabase-js` ב-dependencies (עם package-lock.json), ‏lib/supabase.js, ‏api/laugh.js, ‏api/top.js, השמירה ב-api/joke.js, והדף.
- נבדק בלי משתני Supabase:
  - `/api/laugh` מחזירה 405 ל-GET, ו-400 ל-id לא תקין או לגוף שבור.
  - `/api/top` מחזירה 405 ל-POST.
  - בלי Supabase: ‏laugh ו-top מחזירות 500 עם הודעה בעברית.
  - `/api/joke` (עם OpenAI מדומה) מחזירה את הבדיחה בלי id, ורושמת את השגיאה ב-console.error.
- הדף נבדק בגודל טלפון, מול שרת דמה: ‏"צחקתי · 0" מופיע מתחת לבדיחה. לחיצה מעדכנת את המונה, צובעת במנטה ונועלת, והרשימה נטענת מחדש. בדיחה חדשה מחזירה כפתור פתוח עם 0.
- ברשימה, מונה של 1 מוצג כ"צחוק אחד".
- עוד לא נבדק: חיבור אמיתי ל-Supabase מ-Vercel. זה נבדק אחרי שהמשתנים ב-Vercel וה-push.
