# ARCHITECTURE: בדיחה בלחיצה

## 1. מבנה המערכת בשלוש שכבות

### צד לקוח
- index.html אחד, עם ה-CSS וה-JavaScript בתוכו. עברית, `lang="he"` ו-`dir="rtl"`.
- הלוגו, ארבעת הציורים של הדמות והרקע הם קבצי SVG בתיקיית assets. הדף מחליף ביניהם לפי `data-state` על הבועה: idle, think, joke, error.
- טופס עם תיבה (maxlength 100) וכפתור. בשליחה: POST ל-/api/joke, ואז הצגת הבדיחה או ההודעה.
- מ-Milestone 6: שלוש לשוניות בתחתית, בדיחה, קהילה ואהבתי, כל אחת כתובת עם # (`#joke`, `#community`, `#liked`). רכיב הצבעה אחד, "אהבתי" ו"לא אהבתי", בכל מקום שיש בדיחה. רשימה נטענת מ-/api/feed כשנכנסים ללשונית, ואחרי פעולה. בלי polling.
- auth.js בשורש: כל הכניסה בדפדפן, דרך הספרייה `@supabase/supabase-js` מ-jsDelivr, בגרסה קבועה. היא משמשת רק להרשמה, כניסה, התנתקות ושמירת הטוקן. flowType של pkce. כתובת הפרויקט והמפתח הציבורי מגיעים מ-/api/config.
- כל קריאה ל-/api שולחת את טוקן הגישה בכותרת `Authorization: Bearer <token>`, אם יש. תשובת 401 עם `auth_required` כשנשלח טוקן: הדף מתנתק לבד.
- הדף מדבר רק עם /api. הוא לא קורא ולא כותב אף טבלה. הבקשות היחידות ל-supabase.co הן לנתיב /auth/v1.
- כל טקסט מהשרת או מהמשתמש מוצג עם textContent, אף פעם לא innerHTML.
- רושם את sw.js כ-service worker.
- עד Milestone 6 (היסטוריה, Milestone 4): כפתור "צחקתי" ששולח ל-/api/laugh, ורשימת "הכי מצחיקות" מ-/api/top. Milestone 6 מחליף אותם.

### לוגיקה
- Vercel Functions בתיקייה api, כל אחת עם `export default { async fetch(request) { ... } }`. מחזירות תמיד JSON, עם `Cache-Control: no-store`, ו-`{ "error": "..." }` בשגיאה.
- api/config.js: GET בלבד. מחזירה `{ url, publishableKey }` מ-SUPABASE_URL ומ-SUPABASE_PUBLISHABLE_KEY. אם אחד חסר, או שהמפתח במשתנה הוא מפתח סודי: 500 עם הקוד `auth_not_configured`. אף פעם לא מחזירה מפתח סודי.
- api/joke.js: מקבלת רק POST עם `{ "topic": "..." }`. חותכת את הנושא ל-100 תווים. נושא ריק או גוף שבור נחשבים "אין נושא". אם יש טוקן, מזהה את המשתמש לפני הקריאה ל-OpenAI: טוקן ש-Supabase לא מכיר מחזיר 401 בלי לפנות ל-OpenAI, ו-Supabase לא זמין מחזיר בדיחה בלי שמירה. פונה ל-OpenAI, שומרת את הבדיחה בטבלה jokes עם user_id ו-author_name מהטוקן, ומחזירה `{ joke, id, author_name }`. השמירה נכשלה: הבדיחה חוזרת בלי id, והשגיאה נרשמת ב-console.error.
- api/feed.js (Milestone 6): GET עם mode של new, top או liked. קוראת ל-`joke_feed` דרך rpc. מחליפה את api/top.js.
- api/vote.js (Milestone 6): POST עם טוקן בלבד, `{ id, value }`. קוראת ל-`cast_vote` דרך rpc, עם voter מהטוקן. מחליפה את api/laugh.js.
- api/delete-account.js (Milestone 5): POST עם טוקן בלבד. מנקה את author_name בבדיחות של המשתמש, ואז `supabase.auth.admin.deleteUser`.
- lib/supabase.js: לקוח Supabase אחד עם המפתח הסודי, שכל הפונקציות משתמשות בו. בנוסף: `hasToken(request)`, ‏`getUserFromRequest(request, supabase)`, שמחזירה את המשתמש או null וזורקת שגיאה כש-Supabase לא זמין, ו-`displayName(user)`, שמחזירה את `user_metadata.full_name` עד 30 תווים. הוא מחוץ ל-api, ולכן אין לו כתובת משלו.
- lib/http.js: עזרים קטנים. תשובת JSON עם `Cache-Control: no-store`, תשובת 401 עם `code: "auth_required"`, וקריאת גוף עם מגבלת גודל.
- api/laugh.js ו-api/top.js מ-Milestone 4 נמחקים ב-Milestone 6.

### נתונים
- Supabase (Postgres): הטבלאות public.jokes ו-public.votes, ומשתמשים ב-Supabase Auth (auth.users).
- רק הפונקציות בתיקייה api ניגשות לטבלאות, עם המפתח הסודי. הדפדפן פונה ל-Supabase רק לכניסה, ב-/auth/v1, עם המפתח הציבורי.

## 2. מבנה הנתונים
ה-SQL של כל שינוי שמור בריפו בתיקייה db, ורץ כ-migration באותו שם: create_jokes (Milestone 4), add_joke_authors (Milestone 5) ו-create_votes (Milestone 6).

### public.jokes

| עמודה | סוג | הגדרות |
|---|---|---|
| id | uuid | מפתח ראשי, ברירת מחדל `gen_random_uuid()` |
| created_at | timestamptz | ברירת מחדל `now()` |
| topic | text | הנושא שהמשתמש כתב. יכול להיות ריק |
| text | text | חובה. הבדיחה |
| laughs | integer | חובה, ברירת מחדל 0. מ-Milestone 4. נשאר בטבלה, אבל האפליקציה מפסיקה להשתמש בו ב-Milestone 6 |
| user_id | uuid | Milestone 5. לא חובה. `references auth.users (id) on delete set null`. עם אינדקס |
| author_name | text | Milestone 5. לא חובה. check: null, או בין 1 ל-30 תווים אחרי btrim |

### public.votes (Milestone 6)

| עמודה | סוג | הגדרות |
|---|---|---|
| user_id | uuid | חובה. `references auth.users (id) on delete cascade` |
| joke_id | uuid | חובה. `references public.jokes (id) on delete cascade`. עם אינדקס |
| value | smallint | חובה. check: 1- או 1 |
| voted_at | timestamptz | חובה, ברירת מחדל `now()` |

המפתח הראשי: `(user_id, joke_id)`. הוא מבטיח קול אחד לכל משתמש לכל בדיחה.

### פונקציות בבסיס הנתונים
- `public.add_laugh(joke_id uuid)` (Milestone 4): מוסיפה 1 ל-laughs בעדכון אחד, ומחזירה את המספר החדש. נשארת בבסיס הנתונים, אבל האפליקציה מפסיקה להשתמש בה ב-Milestone 6.
- `public.cast_vote(voter uuid, target uuid, new_value smallint)`, ב-plpgsql: 1 או 1-: insert עם `on conflict (user_id, joke_id) do update` של value ו-voted_at. 0: מוחקת את ההצבעה. כל ערך אחר: שגיאה. מחזירה שורה אחת: likes, dislikes ו-my_vote של הבדיחה.
- `public.joke_feed(viewer uuid, mode text, max_rows integer default 20)`, ב-sql, ‏stable. מחזירה id, created_at, topic, text, author_name, likes, dislikes ו-my_vote. new: לפי created_at מהחדש. top: רק בדיחות עם like אחד לפחות, לפי likes פחות dislikes, ואז לפי likes. liked: רק בדיחות ש-viewer סימן בהן 1, לפי voted_at. viewer הוא null לאורח. max_rows בין 1 ל-50.

### החוזה בין הדף לפונקציות, אחרי Milestone 6

| הפונקציה | בקשה | טוקן | תשובה |
|---|---|---|---|
| /api/config | GET | לא | `{ url, publishableKey }` |
| /api/joke | POST `{ topic }` | רשות | `{ joke, id, author_name }` |
| /api/feed?mode=new או top | GET | רשות | `{ jokes: [{ id, topic, text, author_name, likes, dislikes, my_vote, created_at }] }` |
| /api/feed?mode=liked | GET | חובה | כמו למעלה |
| /api/vote | POST `{ id, value }` | חובה | `{ likes, dislikes, my_vote }` |
| /api/delete-account | POST | חובה | `{ deleted: true }` |

- שגיאה: `{ error: "הודעה קצרה בעברית" }`. כשצריך להתחבר: 401 עם `{ error, code: "auth_required" }`.
- כל התשובות עם `Cache-Control: no-store`, כי הן תלויות במי ששואל.
- /api/vote: value הוא 1, 1- או 0 בדיוק, כמספר, ו-id חייב להיות uuid. אחרת 400. בדיחה שלא קיימת: 404. user_id בגוף לא נחשב.
- /api/feed: 20 שורות ל-new, 10 ל-top, 50 ל-liked. אף פעם לא מחזירה user_id.
- author_name הוא null לאורח, ולבדיחה של מי שמחק את החשבון.

## 3. התחברות והרשאות
רמה 3 לפי course-stack.md, מ-Milestone 5: משתמשים אמיתיים עם הרשמה עצמית, דרך Supabase Auth. עד Milestone 4 הייתה רמה 0.

- הרשמה וכניסה עם מייל וסיסמה (6 תווים לפחות), ושם לתצוגה עד 30 תווים, שנשמר ב-`user_metadata.full_name`. בונוס: כניסה עם Google.
- בדשבורד של Supabase: Allow new users to sign up דולק, ו-Confirm email כבוי. ב-URL Configuration: ‏Site URL היא הכתובת ב-Vercel, וב-Redirect URLs אותה כתובת עם `/**`, ולמי שמריץ במחשב גם `http://localhost:3000/**`.
- אורח ממשיך לבקש בדיחות ולקרוא את הקהילה. כדי לדרג, ולראות את "אהבתי", צריך חשבון.
- כל פונקציה שצריכה לדעת מי שואל מקבלת את הטוקן בכותרת Authorization, ומזהה את המשתמש רק עם `supabase.auth.getUser(token)`. מזהה משתמש או שם שמגיעים מהדף לא נחשבים.
- מחיקת חשבון: רק דרך api/delete-account, כי היא דורשת את המפתח הסודי. הבדיחות נשארות בלי שם ובלי בעלים, וההצבעות נמחקות (on delete cascade).
- ההגנה על העלות: אורך נושא מוגבל, ומגבלת הוצאה בחשבון OpenAI.

הנעילה של Supabase, כדי שרק השרת ייגש לנתונים:
- בכל טבלה, jokes ו-votes: ‏RLS דולק, בלי אף policy. `revoke all` מ-anon ומ-authenticated.
- jokes: ‏`grant select, insert, update` ל-service_role בלבד. votes: ‏`grant select, insert, update, delete` ל-service_role בלבד.
- כל פונקציה בבסיס הנתונים (add_laugh, ‏cast_vote, ‏joke_feed): ‏`security invoker`, ‏`set search_path = ''`, ושמות מלאים כמו `public.votes`. ‏`revoke execute` מ-public, ‏anon ו-authenticated, ו-`grant execute` ל-service_role.
- המפתח הציבורי בדף לא פותח אף טבלה, כי לתפקידים anon ו-authenticated אין grant.
- Supabase לא נותנת לטבלה חדשה הרשאות אוטומטית, לכן ה-grant ל-service_role כתוב במפורש ב-migration.
- Supabase עשויה להציע policy או grant ל-anon. לא מקבלים: הדף לא פונה לטבלאות ישירות.
- כל SQL נשמר קודם כקובץ בתיקייה db, מוצג לי, ורץ דרך המחבר של Supabase רק אחרי אישור. אחרי כל migration מריצים get_advisors, ובודקים שאין התראה על חשיפה.

## 4. שכבת ה-AI
- הקריאה: POST אל `https://api.openai.com/v1/responses`, מתוך הפונקציה בלבד, עם הכותרת `Authorization: Bearer <OPENAI_API_KEY>`.
- הגוף: `model` מ-OPENAI_MODEL או `gpt-5`, ‏`instructions` עם הפרומפט המרכזי, `input` עם הנושא, ‏`reasoning: { effort: "low" }` ו-`max_output_tokens`.
- הפרומפט המרכזי: "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה."
- ה-input: "נושא הבדיחה: [הנושא]". בלי נושא: "אין נושא. ספר בדיחה כללית על החיים."
- התשובה: לוקחים את `output_text` אם קיים. אחרת, את הטקסט מהפריטים מסוג `message` במערך `output`, בחלקים מסוג `output_text`. אין טקסט: שגיאה.
- שגיאה מ-OpenAI: הסטטוס והקוד נרשמים ב-console.error, והדף מקבל הודעה קצרה בעברית לפי הקוד: 401, נגמר הקרדיט, מגבלת הוצאה, 429, 404.
- שם המשתמש, המייל ומזהה המשתמש לא נשלחים למודל. רק הנושא.
- לפני כתיבת הקוד בודקים בתיעוד העדכני של OpenAI ושל Vercel את מבנה הבקשה והתשובה.

## 5. אינטגרציות, APIs ואוטומציות
- OpenAI Responses API, מ-api/joke.js בלבד.
- Supabase, דרך הספרייה הרשמית `@supabase/supabase-js`: בשרת, מהפונקציות בתיקייה api, עם המפתח הסודי. בדפדפן, מ-auth.js, רק ל-Supabase Auth, עם המפתח הציבורי.
- בונוס: Google כספק OAuth ב-Supabase Auth. הלקוח מוגדר ב-Google Cloud Console, והסוד שלו נשמר רק בדשבורד של Supabase.
- אין אוטומציות.

## 6. מפתחות וסודות
| השם | איפה | סוג | מה הוא |
|---|---|---|---|
| OPENAI_API_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | מפתח ה-production, ‏joke-in-a-click. רק הפונקציה קוראת אותו |
| OPENAI_API_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מפתח dev נפרד, ‏joke-in-a-click-dev. הסטודנט מדביק אותו ביד |
| OPENAI_MODEL | Vercel, Environment Variables | Config, לא חובה | שם המודל. בלי המשתנה: gpt-5 |
| SUPABASE_URL | Vercel, Environment Variables, בכל הסביבות. ובהרצה מקומית ב-.env.local | Config | כתובת הפרויקט ב-Supabase |
| SUPABASE_SECRET_KEY | Vercel, Environment Variables, ב-Production וב-Preview. ובהרצה מקומית ב-.env.local | Secret | המפתח הסודי של Supabase. רק lib/supabase.js קורא אותו |
| SUPABASE_PUBLISHABLE_KEY | Vercel, Environment Variables, בכל הסביבות | Config. חדש ב-Milestone 5 | המפתח הציבורי של Supabase, רק לכניסה. api/config.js מחזירה אותו לדף. הוא לא סוד |
| Client Secret של Google | רק בדשבורד של Supabase, בספק Google | בונוס | לא בקוד, לא בריפו ולא ב-Vercel |

- המפתחות הסודיים לא מופיעים בשום קובץ שנכנס לריפו, ולא בצ׳אט עם Claude. היחיד: .env.local במחשב, למי שמריץ מקומית.
- את הערך של SUPABASE_PUBLISHABLE_KEY Claude יכול להביא דרך המחבר של Supabase, עם get_publishable_keys. הוא לא סוד, ולכן הוא לא ב-.env.example.
- מפתח ה-production נשמר ב-Vercel כבר ב-Milestone 1. אחרי כל שינוי במשתנה: Redeploy.
- .claude/settings.json חוסם ל-Claude את הקריאה של .env ושל .env.*. בריפו יש .env.example עם שתי שורות בלבד, בלי ערכים: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=. גם .env.local מכיל את המפתחות האלה, ומי שמריץ מקומית מוסיף לו ביד גם את SUPABASE_URL ואת SUPABASE_PUBLISHABLE_KEY. שם המודל לא נכנס לקובץ: בלי OPENAI_MODEL הקוד משתמש ב-gpt-5.
- הדפדפן לא מקבל אף מפתח סודי. הוא מקבל מ-/api/config רק את כתובת הפרויקט ואת המפתח הציבורי, לכניסה בלבד. בקוד הדף (Ctrl+U) אין sb_publishable_ ואין sb_secret_.
- .gitignore כולל `.env`, ‏`.env.*`, את החריגה `!.env.example`, ‏`.vercel` ו-`node_modules`. הוא נוצר לפני הקומיט הראשון.
- בחשבון OpenAI: קרדיט מראש, Auto recharge כבוי, ומגבלת הוצאה חודשית.

## 7. מבנה התיקיות של הקוד
```
index.html              המסך, עם ה-CSS וה-JavaScript
auth.js                 הכניסה בדפדפן: הרשמה, כניסה, התנתקות, טוקן, ובונוס Google
manifest.webmanifest    name, short_name, start_url, display: standalone, lang: he, dir: rtl, אייקונים
sw.js                   service worker, network-first, בלי /api
package.json            "type": "module". ב-dependencies רק @supabase/supabase-js
.gitignore              .env, .env.*, !.env.example, .vercel, node_modules
.env.example            שתי שורות בלבד: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=, בלי ערכים ובלי הערות
.claude/settings.json   חוסם ל-Claude את הקריאה של .env ושל .env.*
assets/logo.svg
assets/mascot-idle.svg, mascot-think.svg, mascot-joke.svg, mascot-error.svg
assets/bg-dots.svg, bg-doodles.svg
assets/icon.svg, icon-maskable.svg
assets/icon-192.png, icon-512.png, icon-512-maskable.png
api/config.js           כתובת הפרויקט והמפתח הציבורי, לכניסה בדף
api/joke.js             בדיחה מ-OpenAI, ושמירה שלה בטבלה עם המחבר. המקום היחיד שקורא את מפתח OpenAI
api/feed.js             קהילה (new, top) ואהבתי (liked). מחליפה את api/top.js
api/vote.js             "אהבתי" ו"לא אהבתי", דרך cast_vote. מחליפה את api/laugh.js
api/delete-account.js   מחיקת החשבון של המשתמש המחובר
lib/supabase.js         לקוח Supabase אחד, וזיהוי המשתמש מהטוקן. המקום היחיד שקורא את SUPABASE_SECRET_KEY
lib/http.js             תשובות JSON, תשובת 401, וקריאת גוף עם מגבלת גודל
db/create_jokes.sql     הטבלה jokes, הנעילה ו-add_laugh (Milestone 4)
db/add_joke_authors.sql user_id ו-author_name ב-jokes (Milestone 5)
db/create_votes.sql     הטבלה votes, הנעילה, cast_vote ו-joke_feed (Milestone 6)
spec/                   מסמכי האיפיון, ו-spec/plans
```

ה-service worker:
- לשם המטמון יש גרסה (joke-v1, ‏joke-v2...). כל שינוי בקבצים שנשמרים במטמון מעלה אותה, ובכל אחד מ-Milestones 5 ו-6 יש גרסה חדשה.
- באירוע install שומר במטמון את /, את /auth.js (מ-Milestone 5), את ה-manifest, את קבצי ה-SVG מתיקיית assets ואת שני האייקונים.
- בכל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת (כולל supabase.co ו-jsDelivr): לא נוגע בה.

## הנחות והחלטות
- בלי ai-tests.md. במקומו, חמש בדיקות ידניות בתנאי ההשלמה של Milestone 2. המוצר קטן, והפלט הוא טקסט חופשי.
- שני גופנים מ-Google Fonts, Fredoka ו-Playpen Sans Hebrew, עם גיבוי ל-system-ui. ה-service worker לא שומר אותם, כי הם מכתובת אחרת.
- CSS ו-JavaScript בתוך index.html. הכניסה בקובץ נפרד, auth.js, כדי שתהיה במקום אחד.
- `reasoning: { effort: "low" }` כדי שהבדיחה תחזור מהר. אם התיעוד העדכני לא תומך בשדה הזה במודל שנבחר, מורידים אותו.
- הפונקציה כותבת console.log קצר לכל בדיחה (הנושא והמודל), כדי לראות פניות ב-Logs.
- Supabase נוסף ב-Milestone 4, לפי course-stack.md: רק הפונקציות ניגשות לטבלאות, והטבלאות נעולות.
- בלי נתוני דוגמה בטבלה jokes, בניגוד לכלל ב-course-stack.md, בהחלטה מפורשת שלי. הטבלה מתמלאת מבדיחות אמיתיות, ועד ה"אהבתי" הראשון "הכי מצחיקות" ריקה.
- רמה 3 מ-Milestone 5. Confirm email כבוי, ולכן אין מיילים של המערכת, ואין צורך ב-SMTP מותאם (Resend). אין שחזור סיסמה.
- העמודה laughs והפונקציה add_laugh נשארות בבסיס הנתונים. לא מוחקים נתונים. האפליקציה מפסיקה להשתמש בהן ב-Milestone 6.
- אין טעינה בטיימר (polling) ואין עדכון בזמן אמת בין מסכים. רשימה נטענת כשנכנסים ללשונית, ואחרי פעולה.
