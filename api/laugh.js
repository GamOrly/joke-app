// "צחקתי": מוסיפה צחוק אחד דרך add_laugh, ומחזירה את המונה החדש.

import { json } from "../lib/http.js";
import { getSupabase } from "../lib/supabase.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לשלוח רק POST" }, 405);
    }

    let id = "";
    try {
      const body = await request.json();
      if (typeof body?.id === "string") id = body.id.trim();
    } catch {
      // גוף שבור: נכשל בבדיקה למטה
    }

    if (!UUID.test(id)) {
      return json({ error: "מזהה הבדיחה לא תקין." }, 400);
    }

    try {
      const { data, error } = await getSupabase().rpc("add_laugh", { joke_id: id });
      if (error) throw error;
      if (data === null || data === undefined) {
        return json({ error: "הבדיחה לא נמצאה." }, 404);
      }
      return json({ laughs: data });
    } catch (error) {
      console.error("laugh error:", error?.message ?? error);
      return json({ error: "הצחוק לא נשמר. נסו שוב." }, 500);
    }
  },
};
