// הכניסה בדפדפן, ורק היא: הרשמה, כניסה, התנתקות ושמירת הטוקן.
// הספרייה של Supabase (window.supabase) נטענת לפני הקובץ הזה, מ-jsDelivr.
// כתובת הפרויקט והמפתח הציבורי מגיעים מ-/api/config, ולא כתובים כאן.
// הדף לא קורא ולא כותב טבלאות. הבקשות ל-supabase.co הן רק ל-/auth/v1.

(() => {
  let client = null;
  let current = null; // הסשן הנוכחי, או null
  let readyPromise = null;
  const listeners = new Set();

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
        const config = await response.json();
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

        const { data } = await client.auth.getSession();
        current = data?.session ?? null;
        emit();
        return true;
      } catch (error) {
        console.error("auth not ready:", error?.message ?? error);
        client = null;
        return false;
      }
    })();
    return readyPromise;
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

  window.Auth = { ready, signUp, signIn, signOut, session, token, onChange };
})();
