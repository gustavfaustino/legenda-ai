const { callProvider } = require("./lib/providers");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const providerName = "gemini";

    if (!prompt) {
      res.status(400).json({ error: "Prompt inválido." });
      return;
    }
    if (prompt.length > 2000000) {
      res.status(413).json({ error: "Prompt muito grande." });
      return;
    }

    const text = await callProvider({
      providerName,
      prompt,
    });

    res.status(200).json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
};
