// "הכי מצחיקות": חמש הבדיחות עם הכי הרבה צחוקים, רק עם צחוק אחד לפחות.

import { json } from "../lib/http.js";
import { getSupabase } from "../lib/supabase.js";

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר לשלוח רק GET" }, 405);
    }

    try {
      const { data, error } = await getSupabase()
        .from("jokes")
        .select("id, topic, text, laughs")
        .gte("laughs", 1)
        .order("laughs", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return json({ jokes: data ?? [] });
    } catch (error) {
      console.error("top error:", error?.message ?? error);
      return json({ error: "הרשימה לא נטענה כרגע." }, 500);
    }
  },
};
