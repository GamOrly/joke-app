// לקוח Supabase אחד לכל הפונקציות. רק השרת משתמש בו, עם המפתח הסודי.
// הלקוח נוצר רק כשקוראים ל-getSupabase, כדי שמשתנה חסר לא יפיל את api/joke.js.

import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(`Supabase env missing: SUPABASE_URL=${url ? "set" : "missing"} SUPABASE_SECRET_KEY=${key ? "set" : "missing"}`);
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
