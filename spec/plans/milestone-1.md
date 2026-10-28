# Milestone 1: Walking Skeleton

## המטרה
הדף והפונקציה באוויר ב-Vercel, באותה כתובת, ומדברים זה עם זה. המפתח שמור ב-Vercel, עוד בלי AI.

## החלטות
- מצבי מסך: התחלה בלבד, והתשובה מהשרת מוצגת בבועה. טעינה, בדיחה ושגיאה עם הציורים שלהם: ב-Milestone 2.
- הבדיקה: בכתובת של Vercel, אחרי push. בלי `vercel dev`.

## הקבצים
| הקובץ | מה בו |
|---|---|
| `package.json` | `"type": "module"`, בלי dependencies |
| `api/joke.js` | `export default { async fetch(request) }`. רק POST, אחרת 405 עם `{ error }`. קורא `{ topic }`, גוף שבור = נושא ריק. מחזיר `{ joke: "בדיחה זמנית מהשרת: [הנושא]. המפתח: נמצא/חסר" }`. ‏console.log קצר לכל פנייה. בלי CORS ובלי OPTIONS |
| `index.html` | המסך הראשי לפי DESIGN.md: רקע נקודות וקישוטים, לוגו, הסבר, תווית, תיבה (maxlength 100), כפתור, בועה עם mascot-idle, שורת תחתית. CSS ו-JS בתוך הקובץ |

## ההתנהגות בדף
- שליחת הטופס: POST ל-`/api/joke` עם `{ topic }`, כתובת יחסית.
- התשובה (`joke`, או `error`) מוצגת בבועה עם textContent, באזור aria-live.
- הכפתור נעול בזמן הבקשה, כדי שלא יישלחו שתי בקשות.

## בדיקות לפני commit
- `.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים בריפו.
- אין `.env` ואין `.env.local` ב-git.

## צעדים ידניים שלך אחרי ה-push
1. Vercel: New Project, ‏Import ל-`GamOrly/joke-app`, ‏Framework Preset: Other, ‏Deploy.
2. OpenAI, ‏API keys: מפתח production בשם `joke-in-a-click`.
3. Vercel, ‏Settings, ‏Environment Variables: ‏`OPENAI_API_KEY`, ‏Secret, ‏Production ו-Preview. ואז Redeploy.

## מה נבנה בפועל
- `package.json`, ‏`api/joke.js` ו-`index.html` נבנו לפי הטבלה למעלה.
- נושא ריק או גוף שבור: הפונקציה כותבת "בלי נושא" במקום הנושא.
- תשובה עם `joke` מוצגת בכתב יד (Playpen Sans Hebrew, 25). תשובה עם `error`, או תקלת רשת, מוצגת בטקסט רגיל.
- נבדק במחשב: הפונקציה מחזירה 200 עם הנושא, "בלי נושא" על גוף שבור, ו-405 על GET. המסך נבדק ברוחב 375 מול ה-mockup.
