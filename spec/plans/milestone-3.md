# Milestone 3: התקנה בטלפון

## המטרה
מתקינים את האפליקציה במסך הבית, והיא נפתחת במסך מלא.

## החלטות
- הבדיקה: בכתובת של Vercel, אחרי push. בלי `vercel dev`.
- `short_name`: "בדיחה בלחיצה", כמו השם המלא.

## הקבצים
| הקובץ | מה בו |
|---|---|
| `manifest.webmanifest` | `name` ו-`short_name`: "בדיחה בלחיצה". ‏`start_url` ו-`scope`: `/`. ‏`display: standalone`, ‏`lang: he`, ‏`dir: rtl`. ‏`theme_color` ו-`background_color`: `#FFE15A`. שלושה אייקונים: icon-192.png, ‏icon-512.png, ו-icon-512-maskable.png עם `purpose: maskable` |
| `sw.js` | network-first, לפי סעיף 7 ב-ARCHITECTURE.md |
| `index.html` | קישור ל-manifest, ‏`theme-color`, ‏`apple-touch-icon` (לאייפון), ורישום של sw.js |

## ה-service worker
- install: שומר במטמון את `/`, את ה-manifest, את קבצי ה-SVG מתיקיית assets, ואת icon-192.png ו-icon-512.png.
- כל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת (למשל הגופנים מ-Google): לא נוגע בה.
- activate: מוחק מטמונים בשם אחר, כדי שגרסה חדשה של sw.js לא תשאיר שאריות.
- `skipWaiting` ו-`clients.claim`: גרסה חדשה של sw.js נכנסת לפעולה מיד.

## מה נבנה בפועל
- `manifest.webmanifest`, ‏`sw.js` והשינויים ב-`index.html` נבנו לפי הטבלה למעלה. שם המטמון: `joke-v1`.
- נבדק במחשב: ה-manifest הוא JSON תקין, ושלושת האייקונים נטענים (200).
- sw.js נבדק בסימולציה ב-Node: 13 קבצים נשמרים ב-install, מטמון ישן נמחק, POST ו-GET ל-/api והגופנים מ-Google לא נגעים, `/` מגיע מהרשת, ובלי רשת מהמטמון. אין כתובת של /api במטמון.
- עוד לא נבדק: רישום אמיתי של ה-service worker והתקנה בטלפון. הדפדפן המובנה של Claude חוסם service workers, אז זה נבדק בכתובת של Vercel.
