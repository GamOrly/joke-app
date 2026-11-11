// עזרים קטנים לכל הפונקציות בתיקייה api.

// תשובת JSON. תמיד no-store, כי התשובה תלויה במי ששואל.
export function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// 401: צריך להתחבר (או להתחבר שוב).
export function authRequired(message = "צריך להתחבר שוב.") {
  return json({ error: message, code: "auth_required" }, 401);
}

// קריאת גוף JSON עם מגבלת גודל. גוף שבור, ריק או גדול מדי: null.
export async function readJson(request, maxBytes = 4096) {
  try {
    const declared = Number(request.headers.get("content-length"));
    if (declared > maxBytes) return null;
    const text = await request.text();
    if (!text || new TextEncoder().encode(text).length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
