# בדיחה בלחיצה (joke-app)

אפליקציית PWA בעברית: כותבים נושא, מקבלים בדיחה מ-GPT-5, דרך פונקציה ב-Vercel. הבדיחות, המשתמשים וההצבעות נשמרים ב-Supabase.

## מסמכי האיפיון
כל המסמכים בתיקייה `spec/`. הם המקור לכל החלטה:
- `PRD.md`, `MVP.md`, `product-10-definitions.md`: מה בונים.
- `ARCHITECTURE.md`, `tech-stack.md`, `course-stack.md`: איך בונים. אין לחרוג מ-course-stack.md בלי לשאול קודם.
- `DESIGN.md`, עם `wireframes.png`, `mockups.png` ו-`style-guide.png`: איך זה נראה.
- `MILESTONES.md`: סדר העבודה ותנאי ההשלמה.
- `milestones-5-6.md`: המקור של Milestones 5 ו-6 ושל הבונוס, משתמשים וקהילה. התוכן שלו כבר בתוך המסמכים שלמעלה.

התיקייה `assets/` נשארת בשורש, כי האפליקציה משתמשת בה. משתמשים בקבצים כמו שהם.

## שפה
- האפליקציה בעברית, מימין לשמאל (`lang="he"`, `dir="rtl"`).
- התקשורת איתי בעברית.

## הנחיה שוטפת
- בשלב ההקמה ובכל מיילסטון: להנחות אותי צעד אחר צעד מהו השלב הבא. ענייני, קצר, מצומצם וברור.
- לפני ששואלים שאלות: קודם לקרוא את הקבצים, אחר כך לחדד איתי את הנקודות, ורק אז להתחיל.

## מפתחות (חוק ברזל)
- לא לבקש ממני אף מפתח.
- לא לכתוב ולא לקרוא מפתח בשום קובץ.
- מפתחות ה-production שמורים אצלי ב-Vercel: `OPENAI_API_KEY` ו-`SUPABASE_SECRET_KEY`. מפתחות ה-dev אני מדביקה בעצמי ב-`.env.local`.
- `SUPABASE_PUBLISHABLE_KEY` שמור ב-Vercel מסוג Config, בכל הסביבות. הוא לא סוד: Claude יכול להביא את הערך שלו דרך המחבר של Supabase (`get_publishable_keys`), אבל לא כותב אותו בשום קובץ ולא ב-`.env.example`.
- ה-Client Secret של Google (בונוס) נשמר רק בדשבורד של Supabase. לא בקוד, לא בריפו ולא ב-Vercel.
- `.claude/settings.json` חוסם את הקריאה של `.env` ושל `.env.*`. לא לעקוף את החסימה בשום דרך, גם לא דרך shell.
- `.env.example` מכיל רק שתי שורות, `OPENAI_API_KEY=` ו-`SUPABASE_SECRET_KEY=`, בלי ערכים ובלי הערות.
- `.gitignore` מתעלם מ-`.env`, מ-`.env.*`, מ-`.vercel` ומ-`node_modules`, עם החריגה `!.env.example`. לבדוק שהוא קיים לפני כל commit.

## נתונים (Supabase)
- השמירה ב-Supabase. רק הפונקציות בתיקייה `api` ניגשות לטבלאות, דרך לקוח אחד ב-`lib/supabase.js`, עם `SUPABASE_URL` ו-`SUPABASE_SECRET_KEY` מ-`process.env`.
- הדף מדבר רק עם `/api`. הוא לא קורא ולא כותב אף טבלה, ואין בו מפתח סודי.
- כל טבלה נעולה: RLS דולק בלי policy, `revoke all` מ-anon ומ-authenticated, ו-grant ל-service_role רק על מה שצריך. כל פונקציה בבסיס הנתונים: `security invoker`, ‏search_path ריק, `revoke execute` מ-public, anon ו-authenticated, ו-grant ל-service_role. לא מקבלים הצעה של Supabase להוסיף policy או grant ל-anon או ל-authenticated.

## כניסה (Supabase Auth, רמה 3)
- מ-Milestone 5: רמה 3 לפי course-stack.md, משתמשים אמיתיים עם הרשמה עצמית, דרך Supabase Auth. מייל וסיסמה, ובונוס Google.
- הספרייה של Supabase בדפדפן (`auth.js`) משמשת רק לכניסה: הרשמה, כניסה, התנתקות ושמירת הטוקן. כתובת הפרויקט והמפתח הציבורי מגיעים מ-`/api/config`, ולא כתובים בקוד הדף.
- הדף שולח את טוקן הגישה לכל קריאה ל-`/api`, בכותרת `Authorization: Bearer <token>`.
- הפונקציות מזהות משתמש רק עם `supabase.auth.getUser(token)`. מזהה משתמש או שם שמגיעים מהדף, בגוף או בכתובת, לא נחשבים.
- מחיקת חשבון רק דרך `api/delete-account`, בשרת.
- בדפדפן: בקשות ל-supabase.co רק לנתיב `/auth/v1`. אף פעם לא ל-`/rest/v1`.
- שינוי בבסיס הנתונים: דרך המחבר של Supabase, כ-migration. ה-SQL נשמר גם בתיקייה `db/`, ומוצג לי לפני ההרצה. אחרי ההרצה: `get_advisors`, והסבר בעברית.

## Git ופריסה
- ריפו ציבורי: `GamOrly/joke-app` ב-GitHub. ענף `main` בלבד, בלי ענפים ובלי מיזוגים.
- הלינק החי ב-Vercel, לא ב-GitHub Pages. כל push ל-main נפרס לבד.
- ב-Milestone 1: להנחות אותי לייבא את הריפו ל-Vercel (Framework Preset: Other) ולשמור בו את המפתח.
- לספק לי את הלינק החי בסוף כל שלב.

## מודל
- Opus לכל השלבים: ההקמה וכל המיילסטונים.

## עבודה במיילסטונים
- בונים מיילסטון אחרי מיילסטון, לפי `spec/MILESTONES.md`. לכל מיילסטון אני פותחת שיחה חדשה בתיקייה הזו, בשם `milestone-1`, `milestone-2` וכן הלאה.
- לכל מיילסטון ארבעה שלבים:
  1. **תכנון**: קוראים את המסמכים, ומתעדים את התוכנית ב-`spec/plans/milestone-N.md`.
  2. **בנייה**: לפי התוכנית. מעדכנים את קובץ התוכנית במה שנבנה בפועל.
  3. **הרצה**: כדי שאוכל לבדוק, בכתובת של Vercel או במחשב עם `vercel dev` (http://localhost:3000), לפי מה שאבחר.
  4. **דחיפה**: push ל-main, ואז הלינק החי.
- בסוף כל מיילסטון: לעצור, ולחכות לבדיקה ולאישור מפורש שלי לפני שממשיכים.

## החלטות שהתקבלו
- מודל שמסרב לנושא פוגעני: מציגים את מה שהמודל החזיר, בלי קוד נוסף לזיהוי סירוב.
- בלי נתוני דוגמה בטבלה `jokes`, למרות הכלל ב-course-stack.md. הרשימה "הכי מצחיקות" ריקה עד ה"אהבתי" הראשון.
- העמודה `laughs` והפונקציה `add_laugh` מ-Milestone 4 נשארות בבסיס הנתונים. לא מוחקים נתונים. מ-Milestone 6 האפליקציה לא משתמשת בהן.
- Confirm email כבוי. אין שחזור סיסמה, ואין SMTP מותאם.
