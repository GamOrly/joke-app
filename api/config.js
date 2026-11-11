// כתובת הפרויקט והמפתח הציבורי של Supabase, לכניסה בדף בלבד.
// אף פעם לא מחזירה מפתח סודי.

import { json } from "../lib/http.js";

// מפתח סודי: sb_secret_..., או JWT ישן עם role של service_role.
function isSecretKey(key) {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role !== "anon";
  } catch {
    return true;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר לשלוח רק GET" }, 405);
    }

    const url = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey || isSecretKey(publishableKey)) {
      console.error(
        `config error: SUPABASE_URL=${url ? "set" : "missing"} SUPABASE_PUBLISHABLE_KEY=${
          !publishableKey ? "missing" : "not a publishable key"
        }`
      );
      return json({ error: "הכניסה עוד לא מוגדרת.", code: "auth_not_configured" }, 500);
    }

    return json({ url, publishableKey });
  },
};
