// מחיקת החשבון של המשתמש המחובר. רק עם טוקן.
// קודם מנקים את השם מהבדיחות, ואז מוחקים את המשתמש. הבדיחות נשארות בלי שם ובלי בעלים.

import { json, authRequired } from "../lib/http.js";
import { getSupabase, hasToken, getUserFromRequest } from "../lib/supabase.js";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לשלוח רק POST" }, 405);
    }
    if (!hasToken(request)) {
      return authRequired("צריך להתחבר כדי למחוק חשבון.");
    }

    let supabase;
    let user;
    try {
      supabase = getSupabase();
      user = await getUserFromRequest(request, supabase);
    } catch (error) {
      console.error("delete-account error: auth", error?.message ?? error);
      return json({ error: "החשבון לא נמחק. נסו שוב." }, 500);
    }
    if (!user) return authRequired();

    try {
      const { error: clearError } = await supabase
        .from("jokes")
        .update({ author_name: null })
        .eq("user_id", user.id);
      if (clearError) throw clearError;

      // user_id בבדיחות מתאפס לבד (on delete set null)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;

      console.log("delete-account: user deleted");
      return json({ deleted: true });
    } catch (error) {
      console.error("delete-account error:", error?.message ?? error);
      return json({ error: "החשבון לא נמחק. נסו שוב." }, 500);
    }
  },
};
