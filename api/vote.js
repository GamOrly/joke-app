// "אהבתי" ו"לא אהבתי": קול אחד לכל משתמש לכל בדיחה, דרך cast_vote.
// רק עם טוקן. מי שמצביע מגיע מהטוקן בלבד. user_id בגוף לא נחשב.

import { json, authRequired, readJson } from "../lib/http.js";
import { getSupabase, hasToken, getUserFromRequest } from "../lib/supabase.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לשלוח רק POST" }, 405);
    }
    if (!hasToken(request)) {
      return authRequired("כדי לדרג בדיחות צריך חשבון.");
    }

    // value: בדיוק 1, 1- או 0, כמספר. id: uuid.
    const body = await readJson(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const value = body?.value;
    if (!UUID.test(id)) {
      return json({ error: "מזהה הבדיחה לא תקין." }, 400);
    }
    if (typeof value !== "number" || ![1, -1, 0].includes(value)) {
      return json({ error: "ההצבעה לא תקינה." }, 400);
    }

    let supabase;
    let user;
    try {
      supabase = getSupabase();
      user = await getUserFromRequest(request, supabase);
    } catch (error) {
      console.error("vote error: auth", error?.message ?? error);
      return json({ error: "ההצבעה לא נשמרה. נסו שוב." }, 500);
    }
    if (!user) return authRequired();

    try {
      const { data, error } = await supabase.rpc("cast_vote", {
        voter: user.id,
        target: id,
        new_value: value,
      });
      if (error) {
        if (error.code === "P0002") return json({ error: "הבדיחה לא נמצאה." }, 404);
        if (error.code === "22023") return json({ error: "ההצבעה לא תקינה." }, 400);
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("cast_vote returned no row");
      return json({ likes: row.likes, dislikes: row.dislikes, my_vote: row.my_vote });
    } catch (error) {
      console.error("vote error:", error?.message ?? error);
      return json({ error: "ההצבעה לא נשמרה. נסו שוב." }, 500);
    }
  },
};
