// Milestone 1: בדיחה זמנית, בלי AI. רק בודקת שהמפתח קיים, ולא מחזירה אותו.

function json(body, status = 200) {
  return Response.json(body, { status });
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

    const keyStatus = process.env.OPENAI_API_KEY ? "נמצא" : "חסר";
    console.log(`joke request: topic="${topic}" key=${keyStatus}`);

    return json({ joke: `בדיחה זמנית מהשרת: ${topic || "בלי נושא"}. המפתח: ${keyStatus}` });
  },
};
