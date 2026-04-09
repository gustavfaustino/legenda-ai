const { callProvider } = require("./lib/providers");
const {
  applySecurityHeaders,
  enforceAppAccessKey,
  enforceJsonRequest,
  enforceRateLimit,
  enforceSameOrigin,
  sendError,
} = require("./lib/security");

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);

  if (!enforceSameOrigin(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "Metodo nao permitido.");
    return;
  }

  if (!enforceJsonRequest(req, res)) {
    return;
  }

  if (!enforceAppAccessKey(req, res)) {
    return;
  }

  if (
    !enforceRateLimit(req, res, {
      bucket: "translate",
      max: process.env.RATE_LIMIT_TRANSLATE_MAX || 20,
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60_000,
    })
  ) {
    return;
  }

  try {
    const body = parseBody(req.body);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const providerName = "gemini";

    if (!prompt) {
      sendError(res, 400, "Prompt invalido.");
      return;
    }

    const maxPromptChars = Number(process.env.MAX_PROMPT_CHARS || 2_000_000);
    if (prompt.length > maxPromptChars) {
      sendError(res, 413, "Prompt muito grande.");
      return;
    }

    const text = await callProvider({
      providerName,
      prompt,
    });

    res.status(200).json({ text });
  } catch (error) {
    const status = Number(error?.status || 500);
    const safeMessage =
      typeof error?.publicMessage === "string"
        ? error.publicMessage
        : status >= 500
          ? "Falha temporaria ao traduzir. Tente novamente."
          : "Nao foi possivel processar a traducao.";

    console.error("[translate] internal error", {
      status,
      message: error?.message,
    });

    sendError(res, status, safeMessage);
  }
};

function parseBody(rawBody) {
  if (typeof rawBody === "string") {
    try {
      return JSON.parse(rawBody || "{}");
    } catch {
      const error = new Error("invalid json body");
      error.status = 400;
      error.publicMessage = "JSON invalido no corpo da requisicao.";
      throw error;
    }
  }

  if (rawBody && typeof rawBody === "object") {
    return rawBody;
  }

  return {};
}
