// Milestone 2: בדיחה מ-GPT-5 דרך Responses API. המפתח נקרא כאן בלבד, ולא חוזר לדף.

const OPENAI_URL = "https://api.openai.com/v1/responses";

const INSTRUCTIONS =
  "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה.";

function json(body, status = 200) {
  return Response.json(body, { status });
}

// הודעה קצרה בעברית לפי הסטטוס והקוד של OpenAI
function errorMessage(status, code = "", type = "") {
  if (status === 401) return "המפתח של OpenAI לא תקין.";
  if (status === 404) return "המודל לא נמצא. בדקו את OPENAI_MODEL.";
  if (status === 429) {
    if (code === "credit_balance_exhausted" || type === "insufficient_quota" || code === "insufficient_quota") {
      return "נגמר הקרדיט ב-OpenAI.";
    }
    if (code.endsWith("_limit_exceeded")) return "הגענו למגבלת ההוצאה ב-OpenAI.";
    return "יותר מדי בקשות. נסו שוב בעוד רגע.";
  }
  return "אין חיבור ל-OpenAI כרגע. נסו שוב.";
}

// output_text קיים רק לפעמים. אחרת: הטקסט מפריטי message, בחלקים מסוג output_text.
function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("").trim();
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לשלוח רק POST" }, 405);
    }

    let topic = "";
    try {
      const body = await request.json();
      if (typeof body?.topic === "string") topic = body.topic.trim().slice(0, 100);
    } catch {
      // גוף שבור: אין נושא
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("joke error: OPENAI_API_KEY is missing");
      return json({ error: "המפתח חסר בשרת." }, 500);
    }

    const model = process.env.OPENAI_MODEL || "gpt-5";
    const input = topic ? `נושא הבדיחה: ${topic}` : "אין נושא. ספר בדיחה כללית על החיים.";
    console.log(`joke request: topic="${topic}" model=${model}`);

    let response;
    try {
      response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          instructions: INSTRUCTIONS,
          input,
          reasoning: { effort: "low" },
          max_output_tokens: 2000,
        }),
      });
    } catch (error) {
      console.error("joke error: network", error);
      return json({ error: errorMessage(0) }, 502);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = data?.error?.code ?? "";
      const type = data?.error?.type ?? "";
      console.error(`joke error: openai status=${response.status} code=${code} type=${type}`, data?.error?.message);
      return json({ error: errorMessage(response.status, code, type) }, 502);
    }

    const joke = extractText(data);
    if (!joke) {
      console.error(`joke error: no text status=${data?.status}`, data?.incomplete_details);
      return json({ error: "לא התקבלה בדיחה. נסו שוב." }, 502);
    }

    return json({ joke });
  },
};
