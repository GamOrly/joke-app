# Milestone 5: האפליקציה מכירה אותך

## המטרה
הרשמה וכניסה עם מייל וסיסמה, שם לתצוגה, התנתקות ומחיקת חשבון. בדיחה של משתמש מחובר נשמרת עם השם שלו.

## החלטות
- הבדיקה: בכתובת של Vercel, אחרי push.
- `SUPABASE_PUBLISHABLE_KEY`: Claude מביא את הערך עם `get_publishable_keys`, ומכניס אותו ל-Vercel דרך המחבר, מסוג Config (plain), בכל הסביבות. לא נכתב בשום קובץ.
- פרויקט Supabase: ‏joke-app (היחיד בחשבון).
- "צחקתי" ו"הכי מצחיקות" נשארים כמו ב-Milestone 4.
- הספרייה בדפדפן: `@supabase/supabase-js` מ-jsDelivr, בגרסה קבועה (2.x, אותה גרסה כמו בשרת), קובץ ה-UMD.

## הסדר
1. **ביד, אצלך, בדשבורד של Supabase**:
   - Authentication ← Sign In / Providers: ‏Allow new users to sign up דולק, ו-Confirm email כבוי.
   - Authentication ← URL Configuration: ‏Site URL = `https://joke-app-one-khaki.vercel.app`. ב-Redirect URLs: ‏`https://joke-app-one-khaki.vercel.app/**`.
2. **ה-SQL**: ‏db/add_joke_authors.sql מוצג לך. **עצירה**: מריצים רק אחרי אישור.
3. migration ‏`add_joke_authors`, ואז `get_advisors`. הסבר בעברית. **עצירה**: את בודקת.
4. **הקוד**: ‏lib/http.js, ‏lib/supabase.js, ‏api/config.js, ‏api/joke.js, ‏api/delete-account.js, ‏auth.js, ‏index.html, ‏sw.js. בדיקה מקומית מול שרת דמה.
5. Claude מכניס את `SUPABASE_PUBLISHABLE_KEY` ל-Vercel.
6. push, והלינק החי. בדיקה לפי תנאי ההשלמה ב-MILESTONES.md. **עצירה** לאישור שלך.

## ה-SQL (db/add_joke_authors.sql)
```sql
alter table public.jokes
  add column user_id uuid references auth.users (id) on delete set null,
  add column author_name text;

alter table public.jokes
  add constraint jokes_author_name_length
  check (author_name is null or char_length(btrim(author_name)) between 1 and 30);

create index jokes_user_id_idx on public.jokes (user_id);
```
- ה-grant הקיים ל-service_role (select, insert, update) הוא על כל הטבלה, ולכן מכסה את העמודות החדשות. anon ו-authenticated נשארים בלי הרשאות.
- משתמש נמחק: ‏user_id מתאפס לבד (on delete set null).

## הקבצים
| הקובץ | מה בו |
|---|---|
| `lib/http.js` | `json(body, status)` עם `Cache-Control: no-store`. ‏`authRequired(message)`: ‏401 עם `code: "auth_required"`. ‏`readJson(request, maxBytes)`: קריאת גוף עם מגבלת גודל (4KB), גוף שבור או גדול: null |
| `lib/supabase.js` | `getSupabase()` כמו קודם. ‏`hasToken(request)`: יש `Authorization: Bearer ...`. ‏`getUserFromRequest(request, supabase)`: ‏`supabase.auth.getUser(token)`. טוקן לא מוכר: null. ‏Supabase לא זמין (רשת, 5xx, משתנה חסר): זורקת. ‏`displayName(user)`: ‏`user_metadata.full_name`, אחרי trim, עד 30 תווים, או null |
| `api/config.js` | GET בלבד. ‏`{ url, publishableKey }`. חסר משתנה, או מפתח שמתחיל ב-`sb_secret_` או JWT עם role ‏service_role: ‏500, ‏`code: "auth_not_configured"` |
| `api/joke.js` | יש טוקן: מזהים לפני OpenAI. ‏null: ‏401 auth_required, בלי OpenAI. זריקה: ממשיכים כאורח, בלי שמירה. שמירה עם user_id ו-author_name. תשובה `{ joke, id, author_name }` |
| `api/delete-account.js` | POST בלבד, טוקן חובה (אחרת 401). ‏update של author_name ל-null בבדיחות של המשתמש, ואז `auth.admin.deleteUser(user.id)`. תשובה `{ deleted: true }` |
| `api/laugh.js`, `api/top.js` | עוברים ל-lib/http.js (no-store). ההתנהגות לא משתנה |
| `auth.js` | `window.Auth`: ‏`ready()` (טוען את /api/config ויוצר לקוח עם pkce), ‏`signUp(name, email, password)`, ‏`signIn(email, password)`, ‏`signOut()` ב-scope ‏local, ‏`session()`, ‏`token()`, ‏`onChange(fn)`. הודעות שגיאה בעברית |
| `index.html` | הספרייה מ-jsDelivr ו-auth.js. כפתור חשבון, חלון כניסה, חלון "החשבון שלי", ‏`api()` ששולח טוקן, ו"נכתבה עכשיו בשבילך" |
| `sw.js` | `joke-v3`, ו-`/auth.js` ברשימה |

## הדף
- כפתור החשבון: בראש המסך, בפינה השמאלית העליונה. מדבקה לבנה עם מסגרת דיו וצל קשה. לאורח "כניסה". למחובר עיגול סגול עם האות הראשונה, והשם.
- חלון הכניסה (`<dialog>`): שתי לשוניות, "כניסה" ו"הרשמה". בהרשמה: "איך לקרוא לך?" (maxlength 30), מייל, סיסמה (minlength 6). הודעת שגיאה באדום בתוך החלון.
- חלון "החשבון שלי": השם, המייל, "התנתקות", ו"מחיקת החשבון" עם שאלת אישור בתוך החלון ("בטוח? אי אפשר לבטל").
- חלונות: עולים מלמטה בטלפון, במרכז במחשב. פינות 26, מסגרת 3, צל קשה 6. ‏Escape ולחיצה מחוץ לחלון סוגרים.
- 401 עם auth_required כשנשלח טוקן: התנתקות, והודעה "צריך להתחבר שוב" בבועה.
- מתחת לבדיחה עם author_name: "נכתבה עכשיו בשבילך, [השם]", בדיו רך.

## הודעות שגיאה (auth.js)
| מצב | ההודעה |
|---|---|
| סיסמה או מייל שגויים | המייל או הסיסמה לא נכונים. |
| מייל שכבר רשום | המייל הזה כבר רשום. נסו להתחבר. |
| סיסמה קצרה | הסיסמה צריכה 6 תווים לפחות. |
| מייל לא תקין | המייל לא נראה תקין. |
| שם ריק | איך לקרוא לך? כתבו שם. |
| יותר מדי ניסיונות | יותר מדי ניסיונות. נסו שוב בעוד רגע. |
| אחר / אין חיבור | הכניסה לא הצליחה. נסו שוב. |

## מה נבנה בפועל
- migration ‏`add_joke_authors` רץ (11.11.2026), לפי ה-SQL למעלה.
- נבדק אחרי ההרצה: ‏RLS דולק עם 0 policies. ל-service_role יש רק SELECT, ‏INSERT ו-UPDATE. ל-anon ול-authenticated אין הרשאות, גם לא על העמודות החדשות. ארבע הבדיחות הקיימות נשארו, עם user_id ו-author_name ריקים.
- `get_advisors`: באבטחה רק `rls_enabled_no_policy` (INFO), וזה מכוון. בביצועים רק `unused_index` על `jokes_user_id_idx` (INFO), כי האינדקס חדש ועוד לא היה בו שימוש.
- הקוד נבנה לפי טבלת הקבצים. שינויים קטנים מהתוכנית:
  - הספרייה בדפדפן: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js` (נבדק: 200).
  - `api/config.js` דוחה כל מפתח שאינו ציבורי: ‏`sb_secret_`, או JWT שה-role שלו אינו anon.
  - `api()` בדף מחכה ל-`Auth.ready()` לפני כל קריאה, כדי שבדיחה ראשונה של משתמש מחובר תישלח עם הטוקן.
  - `/api/config` לא עונה, או שהספרייה לא נטענה: כפתור החשבון מוסתר, והבדיחות עובדות כרגיל, כאורח.
  - שאלת האישור למחיקה מופיעה בתוך חלון "החשבון שלי", עם "כן, למחוק" ו"ביטול".
- נבדק בשרת, מול Supabase ו-OpenAI מדומים:
  - אורח: בדיחה נשמרת עם user_id ו-author_name ריקים. התשובה עם `author_name: null`.
  - משתמש: נשמר עם user_id ו-author_name מהטוקן. שם ו-user_id ששלחו בגוף לא נחשבים. שם ארוך נחתך ל-30 תווים.
  - טוקן לא מוכר: ‏401 עם auth_required, ו-OpenAI לא נקרא.
  - Supabase לא זמין (503): הבדיחה מגיעה, בלי שמירה.
  - delete-account: בלי טוקן 401, ‏GET ‏405, טוקן לא מוכר 401. עם טוקן: ניקוי author_name ואז מחיקת המשתמש.
  - config: חסר, ‏sb_secret_ ו-JWT של service_role מחזירים 500 עם auth_not_configured. ‏sb_publishable_ מחזיר 200. ‏POST ‏405.
  - כל התשובות עם `Cache-Control: no-store`.
- נבדק בדף, בגודל טלפון, מול שרת דמה וספריית Supabase מדומה: הרשמה (וסיסמה קצרה), השם בכפתור, "נכתבה עכשיו בשבילך, נועה", התנתקות, סיסמה שגויה, מייל רשום, כניסה, רענון שומר על הכניסה, מחיקה עם אישור וביטול, טוקן שפג ("צריך להתחבר שוב." והתנתקות), וסגירה בלחיצה מחוץ לחלון.
- `SUPABASE_PUBLISHABLE_KEY` הוכנס ל-Vercel על ידי Claude, מסוג plain, ב-Production, ‏Preview ו-Development. הערך הובא עם `get_publishable_keys`, ולא נכתב בשום קובץ.
- push ‏(commit 434ed9a), והפריסה הצליחה. הלינק החי: https://joke-app-one-khaki.vercel.app.
- נבדק בכתובת החיה:
  - `/api/config` מחזירה 200, עם כתובת הפרויקט ומפתח `sb_publishable_`, ו-`Cache-Control: no-store`.
  - `/auth.js` נטען (200). בקוד הדף אין `sb_publishable_` ואין `sb_secret_`.
  - `/api/delete-account` בלי טוקן: ‏401 עם auth_required.
  - `/api/joke` עם טוקן לא תקין: ‏401 עם auth_required.
- נבדק ואושר ידנית בכתובת החיה (11.11.2026): כל שמונת תנאי ההשלמה ב-MILESTONES.md. ב-Network: ההתנתקות פנתה ל-`/auth/v1/logout?scope=local`, הכניסה ל-`/auth/v1/token?grant_type=password`, ואין אף בקשה ל-`/rest/v1`. ‏`/api/config` מחזירה רק `url` ו-`publishableKey`, עם מפתח `sb_publishable_`.
