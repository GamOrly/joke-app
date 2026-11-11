// הכניסה בדפדפן, ורק היא: הרשמה, כניסה, התנתקות ושמירת הטוקן.
// הספרייה של Supabase (window.supabase) נטענת לפני הקובץ הזה, מ-jsDelivr.
// כתובת הפרויקט והמפתח הציבורי מגיעים מ-/api/config, ולא כתובים כאן.
// הדף לא קורא ולא כותב טבלאות. הבקשות ל-supabase.co הן רק ל-/auth/v1.

// בונוס: כניסה עם Google (OAuth, ‏pkce). הספרייה מחליפה את ?code= בטוקן לבד.

(() => {
  let client = null;
  let config = null; // { url, publishableKey } מ-/api/config
  let current = null; // הסשן הנוכחי, או null
  let readyPromise = null;
  const listeners = new Set();

  // חזרה מ-Google: מה היה בכתובת, לפני שהספרייה נגעה בה
  const OAUTH_PARAMS = ["code", "error", "error_code", "error_description", "sb_flow_id", "state"];
  const startUrl = new URL(window.location.href);
  const startHash = new URLSearchParams(startUrl.hash.slice(1));
  const oauthReturn = {
    code: startUrl.searchParams.has("code"),
    error: startUrl.searchParams.get("error") || startHash.get("error") || "",
  };
  let oauthOutcome = { returned: false, ok: false, error: "" };

  const MESSAGES = {
    invalid_credentials: "המייל או הסיסמה לא נכונים.",
    user_already_exists: "המייל הזה כבר רשום. נסו להתחבר.",
    email_exists: "המייל הזה כבר רשום. נסו להתחבר.",
    weak_password: "הסיסמה צריכה 6 תווים לפחות.",
    email_address_invalid: "המייל לא נראה תקין.",
    validation_failed: "המייל או הסיסמה לא תקינים.",
    over_request_rate_limit: "יותר מדי ניסיונות. נסו שוב בעוד רגע.",
    over_email_send_rate_limit: "יותר מדי ניסיונות. נסו שוב בעוד רגע.",
    signup_disabled: "ההרשמה סגורה כרגע.",
    email_not_confirmed: "צריך לאשר את המייל לפני הכניסה.",
    not_configured: "הכניסה עוד לא זמינה. נסו שוב מאוחר יותר.",
    google_off: "הכניסה עם Google עוד לא מוגדרת.",
    google_cancelled: "הכניסה עם Google בוטלה.",
    google_failed: "הכניסה עם Google לא הצליחה. נסו שוב.",
  };
  const FALLBACK = "הכניסה לא הצליחה. נסו שוב.";

  function hebrew(error) {
    if (!error) return FALLBACK;
    if (MESSAGES[error.code]) return MESSAGES[error.code];
    const text = String(error.message || "").toLowerCase();
    if (text.includes("invalid login")) return MESSAGES.invalid_credentials;
    if (text.includes("already registered")) return MESSAGES.user_already_exists;
    if (text.includes("password should be")) return MESSAGES.weak_password;
    if (text.includes("email") && text.includes("invalid")) return MESSAGES.email_address_invalid;
    return FALLBACK;
  }

  function fail(message) {
    return { ok: false, error: message };
  }

  function emit() {
    for (const fn of listeners) {
      try { fn(current); } catch (error) { console.error(error); }
    }
  }

  // טוען את ההגדרות ויוצר את הלקוח, פעם אחת. מחזיר true אם הכניסה זמינה.
  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      try {
        if (!window.supabase?.createClient) throw new Error("supabase library missing");
        const response = await fetch("/api/config");
        config = await response.json();
        if (!response.ok || !config.url || !config.publishableKey) throw new Error(config.code || "config failed");

        client = window.supabase.createClient(config.url, config.publishableKey, {
          auth: {
            flowType: "pkce",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        client.auth.onAuthStateChange((_event, session) => {
          current = session ?? null;
          emit();
        });

        // getSession מחכה שהספרייה תסיים להחליף את ?code= בטוקן
        const { data } = await client.auth.getSession();
        current = data?.session ?? null;
        finishOAuthReturn();
        emit();
        return true;
      } catch (error) {
        console.error("auth not ready:", error?.message ?? error);
        client = null;
        if (oauthReturn.code || oauthReturn.error) {
          oauthOutcome = { returned: true, ok: false, error: MESSAGES.google_failed };
          cleanUrl();
        }
        return false;
      }
    })();
    return readyPromise;
  }

  // בחזרה מ-Google: הצליח או לא, ומנקים את הכתובת בשני המקרים
  function finishOAuthReturn() {
    if (!oauthReturn.code && !oauthReturn.error) return;
    if (oauthReturn.error) {
      const cancelled = oauthReturn.error === "access_denied";
      oauthOutcome = { returned: true, ok: false, error: cancelled ? MESSAGES.google_cancelled : MESSAGES.google_failed };
      console.error("google sign-in returned error:", oauthReturn.error);
    } else if (!current) {
      oauthOutcome = { returned: true, ok: false, error: MESSAGES.google_failed };
      console.error("google sign-in: code was not exchanged");
    } else {
      oauthOutcome = { returned: true, ok: true, error: "" };
    }
    cleanUrl();
  }

  function cleanUrl() {
    const url = new URL(window.location.href);
    for (const key of OAUTH_PARAMS) url.searchParams.delete(key);
    const hash = new URLSearchParams(url.hash.slice(1));
    if (hash.has("error") || hash.has("error_description") || hash.has("access_token")) url.hash = "";
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  // כניסה עם Google. קודם בודקים ש-Google דולק, בלי לצאת מהדף.
  // beforeLeave נקרא רגע לפני היציאה, כדי לשמור את מה שהמשתמש עשה.
  async function google(beforeLeave) {
    if (!(await ready())) return fail(MESSAGES.not_configured);

    try {
      const response = await fetch(`${config.url}/auth/v1/settings`, {
        headers: { apikey: config.publishableKey },
      });
      const settings = await response.json();
      if (!response.ok || settings?.external?.google !== true) return fail(MESSAGES.google_off);
    } catch (error) {
      console.error("google settings check failed:", error);
      return fail(MESSAGES.google_failed);
    }

    try {
      beforeLeave?.();
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      return { ok: true, leaving: true };
    } catch (error) {
      console.error("google sign-in error:", error);
      return fail(MESSAGES.google_failed);
    }
  }

  // התוצאה של החזרה מ-Google, אם הייתה: { returned, ok, error }
  function oauthResult() {
    return oauthOutcome;
  }

  async function signUp(name, email, password) {
    if (!(await ready())) return fail(MESSAGES.not_configured);
    const fullName = String(name || "").trim();
    if (!fullName) return fail("איך לקרוא לך? כתבו שם.");
    if ([...fullName].length > 30) return fail("השם ארוך מדי. עד 30 תווים.");
    if (String(password || "").length < 6) return fail(MESSAGES.weak_password);

    try {
      const { data, error } = await client.auth.signUp({
        email: String(email || "").trim(),
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return fail(hebrew(error));
      // Confirm email כבוי, ולכן ההרשמה מחזירה סשן מיד
      if (!data?.session) return fail(MESSAGES.email_not_confirmed);
      return { ok: true };
    } catch (error) {
      console.error("signUp error:", error);
      return fail(FALLBACK);
    }
  }

  async function signIn(email, password) {
    if (!(await ready())) return fail(MESSAGES.not_configured);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: String(email || "").trim(),
        password,
      });
      if (error) return fail(hebrew(error));
      return { ok: true };
    } catch (error) {
      console.error("signIn error:", error);
      return fail(FALLBACK);
    }
  }

  // התנתקות מהמכשיר הזה בלבד
  async function signOut() {
    if (!client) return;
    try {
      await client.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("signOut error:", error);
    }
    if (current) {
      current = null;
      emit();
    }
  }

  function session() {
    return current;
  }

  // טוקן הגישה, מרוענן אם צריך. אין סשן: null.
  async function token() {
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.Auth = { ready, signUp, signIn, signOut, session, token, onChange, google, oauthResult };
})();
