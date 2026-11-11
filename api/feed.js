// רשימות הבדיחות, דרך joke_feed. מחליפה את api/top.js.
// new ו-top: גם לאורח. liked: רק עם טוקן. מי שמסתכל מגיע מהטוקן בלבד.

import { json, authRequired } from "../lib/http.js";
import { getSupabase, hasToken, getUserFromRequest } from "../lib/supabase.js";

const ROWS = { new: 20, top: 10, liked: 50 };

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר לשלוח רק GET" }, 405);
    }

    const mode = new URL(request.url).searchParams.get("mode") || "";
    if (!Object.hasOwn(ROWS, mode)) {
      return json({ error: "סוג הרשימה לא תקין." }, 400);
    }
    if (mode === "liked" && !hasToken(request)) {
      return authRequired("צריך להתחבר כדי לראות את מה שאהבת.");
    }

    try {
      const supabase = getSupabase();

      // יש טוקן: מזהים את המשתמש, כדי להחזיר גם את ההצבעה שלו. טוקן לא מוכר: 401.
      let viewer = null;
      if (hasToken(request)) {
        const user = await getUserFromRequest(request, supabase);
        if (!user) return authRequired();
        viewer = user.id;
      }

      const { data, error } = await supabase.rpc("joke_feed", {
        viewer,
        mode,
        max_rows: ROWS[mode],
      });
      if (error) throw error;

      // רק השדות האלה יוצאים לדף. אף פעם לא user_id.
      const jokes = (data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        topic: row.topic,
        text: row.text,
        author_name: row.author_name,
        likes: row.likes,
        dislikes: row.dislikes,
        my_vote: row.my_vote,
      }));
      return json({ jokes });
    } catch (error) {
      console.error(`feed error: mode=${mode}`, error?.message ?? error);
      return json({ error: "הרשימה לא נטענה כרגע." }, 500);
    }
  },
};
