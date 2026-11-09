# ARCHITECTURE: בדיחה בלחיצה

## 1. מבנה המערכת בשלוש שכבות

### צד לקוח
- index.html אחד, עם ה-CSS וה-JavaScript בתוכו. עברית, `lang="he"` ו-`dir="rtl"`.
- הלוגו, ארבעת הציורים של הדמות והרקע הם קבצי SVG בתיקיית assets. הדף מחליף ביניהם לפי `data-state` על הבועה: idle, think, joke, error.
- טופס עם תיבה (maxlength 100) וכפתור. בשליחה: POST ל-/api/joke, ואז הצגת הבדיחה או ההודעה.
- מתחת לכל בדיחת AI: כפתור "צחקתי" עם מונה. לחיצה שולחת POST ל-/api/laugh, ואחריה הכפתור ננעל.
- רשימת "הכי מצחיקות": נטענת מ-/api/top בפתיחת הדף, ושוב אחרי כל צחוק. בלי polling.
- הדף מדבר רק עם /api. אין בו כתובת או מפתח של Supabase.
- הטקסט שחוזר מוצג עם textContent, לא innerHTML.
- רושם את sw.js כ-service worker.

### לוגיקה
- שלוש Vercel Functions בתיקייה api, כל אחת עם `export default { async fetch(request) { ... } }`. מחזירות תמיד JSON, ו-`{ "error": "..." }` בשגיאה.
- api/joke.js: מקבלת רק POST עם `{ "topic": "..." }`. חותכת את הנושא ל-100 תווים. נושא ריק או גוף שבור נחשבים "אין נושא". פונה ל-OpenAI ומחלצת את הטקסט. שומרת את הבדיחה בטבלה jokes, ומחזירה את הבדיחה ואת ה-id שלה. השמירה נכשלה: הבדיחה חוזרת בלי id, והשגיאה נרשמת ב-console.error.
- api/laugh.js: מקבלת רק POST עם `{ "id": "..." }`, בודקת שזה uuid, וקוראת ל-`add_laugh` דרך rpc. מחזירה את המונה החדש.
- api/top.js: מחזירה את חמש הבדיחות עם הכי הרבה צחוקים, רק עם צחוק אחד לפחות.
- lib/supabase.js: לקוח Supabase אחד, שכל הפונקציות משתמשות בו. הוא מחוץ ל-api, ולכן אין לו כתובת משלו.

### נתונים
- Supabase (Postgres), טבלה אחת: public.jokes.
- רק הפונקציות בתיקייה api מדברות עם Supabase, עם המפתח הסודי. הדפדפן לא פונה ל-Supabase אף פעם.

## 2. מבנה הנתונים
טבלה אחת, `public.jokes`. ה-SQL שמור בריפו בקובץ db/create_jokes.sql, ורץ כ-migration בשם create_jokes.

| עמודה | סוג | הגדרות |
|---|---|---|
| id | uuid | מפתח ראשי, ברירת מחדל `gen_random_uuid()` |
| created_at | timestamptz | ברירת מחדל `now()` |
| topic | text | הנושא שהמשתמש כתב. יכול להיות ריק |
| text | text | חובה. הבדיחה |
| laughs | integer | חובה, ברירת מחדל 0 |

פונקציה בבסיס הנתונים: `public.add_laugh(joke_id uuid)`. מוסיפה 1 ל-laughs בעדכון אחד, ומחזירה את המספר החדש. כך שתי לחיצות באותו רגע לא דורסות זו את זו.

החוזה בין הדף לפונקציות:

| הנתיב | הבקשה | הצלחה | שגיאה |
|---|---|---|---|
| /api/joke | POST `{ "topic": "חתולים" }`, או `{ "topic": "" }` | 200 `{ "joke": "...", "id": "uuid" }`. השמירה נכשלה: בלי id | 405, 500 או 502 `{ "error": "..." }` |
| /api/laugh | POST `{ "id": "uuid" }` | 200 `{ "laughs": 3 }` | 400 (לא uuid), 404 (אין בדיחה כזו), 405, 500 |
| /api/top | GET | 200 `{ "jokes": [{ "id", "topic", "text", "laughs" }] }`, עד חמש | 405, 500 |

## 3. התחברות והרשאות
אין כניסה, רמה 0. כל גולש יכול לבקש בדיחה ולצחוק. ההגנה על העלות היא אורך נושא מוגבל, ומגבלת הוצאה בחשבון OpenAI.

הנעילה של Supabase, כדי שרק השרת ייגש לנתונים:
- בטבלה jokes: ‏RLS דולק, בלי אף policy.
- `grant select, insert, update` על הטבלה ל-service_role בלבד. `revoke all` מ-anon ומ-authenticated.
- `add_laugh`: ‏`security invoker`, ‏search_path ריק, ושמות מלאים כמו `public.jokes`. ‏`revoke execute` מ-public, ‏anon ו-authenticated, ו-`grant execute` ל-service_role.
- Supabase לא נותנת לטבלה חדשה הרשאות אוטומטית, לכן ה-grant ל-service_role כתוב במפורש ב-migration.
- Supabase עשויה להציע policy או grant ל-anon. לא מקבלים: הדף לא פונה ל-Supabase ישירות.
- אחרי ה-migration מריצים get_advisors, ובודקים שאין התראה על חשיפה של הטבלה.

## 4. שכבת ה-AI
- הקריאה: POST אל `https://api.openai.com/v1/responses`, מתוך הפונקציה בלבד, עם הכותרת `Authorization: Bearer <OPENAI_API_KEY>`.
- הגוף: `model` מ-OPENAI_MODEL או `gpt-5`, ‏`instructions` עם הפרומפט המרכזי, `input` עם הנושא, ‏`reasoning: { effort: "low" }` ו-`max_output_tokens`.
- הפרומפט המרכזי: "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה."
- ה-input: "נושא הבדיחה: [הנושא]". בלי נושא: "אין נושא. ספר בדיחה כללית על החיים."
- התשובה: לוקחים את `output_text` אם קיים. אחרת, את הטקסט מהפריטים מסוג `message` במערך `output`, בחלקים מסוג `output_text`. אין טקסט: שגיאה.
- שגיאה מ-OpenAI: הסטטוס והקוד נרשמים ב-console.error, והדף מקבל הודעה קצרה בעברית לפי הקוד: 401, נגמר הקרדיט, מגבלת הוצאה, 429, 404.
- לפני כתיבת הקוד בודקים בתיעוד העדכני של OpenAI ושל Vercel את מבנה הבקשה והתשובה.

## 5. אינטגרציות, APIs ואוטומציות
- OpenAI Responses API, מ-api/joke.js בלבד.
- Supabase, דרך הספרייה הרשמית `@supabase/supabase-js`, מהפונקציות בתיקייה api בלבד.
- אין אוטומציות.

## 6. מפתחות וסודות
| השם | איפה | סוג | מה הוא |
|---|---|---|---|
| OPENAI_API_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | מפתח ה-production, ‏joke-in-a-click. רק הפונקציה קוראת אותו |
| OPENAI_API_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מפתח dev נפרד, ‏joke-in-a-click-dev. הסטודנט מדביק אותו ביד |
| OPENAI_MODEL | Vercel, Environment Variables | Config, לא חובה | שם המודל. בלי המשתנה: gpt-5 |
| SUPABASE_URL | Vercel, Environment Variables, ב-Production וב-Preview. ובהרצה מקומית ב-.env.local | Config | כתובת הפרויקט ב-Supabase |
| SUPABASE_SECRET_KEY | Vercel, Environment Variables, ב-Production וב-Preview. ובהרצה מקומית ב-.env.local | Secret | המפתח הסודי של Supabase. רק lib/supabase.js קורא אותו |

- המפתח לא מופיע בשום קובץ שנכנס לריפו, ולא בצ׳אט עם Claude. היחיד: .env.local במחשב, למי שמריץ מקומית.
- מפתח ה-production נשמר ב-Vercel כבר ב-Milestone 1. אחרי כל שינוי במשתנה: Redeploy.
- .claude/settings.json חוסם ל-Claude את הקריאה של .env ושל .env.*. בריפו יש .env.example עם שתי שורות בלבד, בלי ערכים: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=. גם .env.local מכיל את המפתחות האלה, ומי שמריץ מקומית מוסיף לו ביד גם את SUPABASE_URL. שם המודל לא נכנס לקובץ: בלי OPENAI_MODEL הקוד משתמש ב-gpt-5.
- הדפדפן לא מקבל אף מפתח, ולא את הכתובת של Supabase. הוא פונה רק ל-/api.
- .gitignore כולל `.env`, ‏`.env.*`, את החריגה `!.env.example`, ‏`.vercel` ו-`node_modules`. הוא נוצר לפני הקומיט הראשון.
- בחשבון OpenAI: קרדיט מראש, Auto recharge כבוי, ומגבלת הוצאה חודשית.

## 7. מבנה התיקיות של הקוד
```
index.html              המסך, עם ה-CSS וה-JavaScript
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
api/joke.js             בדיחה מ-OpenAI, ושמירה שלה בטבלה. המקום היחיד שקורא את מפתח OpenAI
api/laugh.js            "צחקתי": מוסיפה צחוק דרך add_laugh
api/top.js              רשימת "הכי מצחיקות"
lib/supabase.js         לקוח Supabase אחד. המקום היחיד שקורא את SUPABASE_URL ואת SUPABASE_SECRET_KEY
db/create_jokes.sql     ה-SQL של הטבלה, הנעילה ו-add_laugh
spec/                   מסמכי האיפיון, ו-spec/plans
```

ה-service worker:
- לשם המטמון יש גרסה (joke-v1, ‏joke-v2...). כל שינוי בקבצים שנשמרים במטמון מעלה אותה.
- באירוע install שומר במטמון את /, את ה-manifest, את קבצי ה-SVG מתיקיית assets ואת שני האייקונים.
- בכל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת: לא נוגע בה.

## הנחות והחלטות
- בלי ai-tests.md. במקומו, חמש בדיקות ידניות בתנאי ההשלמה של Milestone 2. המוצר קטן, והפלט הוא טקסט חופשי.
- שני גופנים מ-Google Fonts, Fredoka ו-Playpen Sans Hebrew, עם גיבוי ל-system-ui. ה-service worker לא שומר אותם, כי הם מכתובת אחרת.
- CSS ו-JavaScript בתוך index.html, כי יש מסך אחד.
- `reasoning: { effort: "low" }` כדי שהבדיחה תחזור מהר. אם התיעוד העדכני לא תומך בשדה הזה במודל שנבחר, מורידים אותו.
- הפונקציה כותבת console.log קצר לכל בדיחה (הנושא והמודל), כדי לראות פניות ב-Logs.
- Supabase נוסף ב-Milestone 4, לפי course-stack.md: רק הפונקציות ניגשות אליו, והטבלה נעולה.
- בלי נתוני דוגמה בטבלה jokes, בניגוד לכלל ב-course-stack.md, בהחלטה מפורשת שלי. הטבלה מתמלאת מבדיחות אמיתיות, ועד הצחוק הראשון רשימת "הכי מצחיקות" ריקה.
- הכפתור "צחקתי" ננעל אחרי לחיצה בדף בלבד. אין זיהוי משתמש, ולכן אין מניעה של צחוק כפול אחרי רענון.
