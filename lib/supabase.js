// לקוח Supabase אחד לכל הפונקציות. רק השרת משתמש בו, עם המפתח הסודי.
// הלקוח נוצר רק כשקוראים ל-getSupabase, כדי שמשתנה חסר לא יפיל את api/joke.js.
// Milestone 5: זיהוי המשתמש מהטוקן, והשם שלו לתצוגה.

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
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

// הטוקן מהכותרת Authorization: Bearer <token>, או "".
function tokenFrom(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : "";
}

export function hasToken(request) {
  return tokenFrom(request) !== "";
}

// המשתמש לפי הטוקן, רק דרך supabase.auth.getUser.
// טוקן ש-Supabase לא מכיר (תשובת 4xx): null. Supabase לא זמין: זורקת.
export async function getUserFromRequest(request, supabase) {
  const token = tokenFrom(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    if (error.status >= 400 && error.status < 500) return null;
    throw error;
  }
  return data?.user ?? null;
}

// השם לתצוגה: user_metadata.full_name, עד 30 תווים. אין שם: null.
export function displayName(user) {
  const name = user?.user_metadata?.full_name;
  if (typeof name !== "string") return null;
  const trimmed = [...name.trim()].slice(0, 30).join("").trim();
  return trimmed || null;
}
