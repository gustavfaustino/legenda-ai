const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_PROVIDER_ID = "gemini";
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1500;

function getPublicProviders() {
  const enabled = Boolean(process.env.GEMINI_API_KEY);

  return {
    defaultProvider: GEMINI_PROVIDER_ID,
    providers: [
      {
        id: GEMINI_PROVIDER_ID,
        label: "Gemini 2.5 Flash",
        defaultModel: GEMINI_MODEL,
        enabled,
      },
    ],
  };
}

async function callProvider({ providerName, prompt }) {
  const selectedProvider = (providerName || GEMINI_PROVIDER_ID).toLowerCase();
  if (selectedProvider !== GEMINI_PROVIDER_ID) {
    throw createPublicError(400, "Provedor invalido.", "unsupported provider");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw createPublicError(503, "Servico de traducao indisponivel.", "missing GEMINI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response?.text?.() || "";

    if (!text.trim()) {
      throw createPublicError(502, "Resposta vazia do provedor.", "empty model response");
    }

    return text;
  });
}

async function withRetry(fn) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        break;
      }

      if (attempt === MAX_RETRIES) {
        throw createPublicError(
          429,
          "Limite temporario do provedor. Aguarde alguns segundos e tente novamente.",
          String(error?.message || "retry limit reached"),
        );
      }

      const waitMs = getRetryDelayMs(error, attempt);
      await sleep(waitMs);
    }
  }

  throw normalizeGeminiError(lastError);
}

function isRetryableError(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || error?.code || 0);

  if (status === 429 || status === 503) {
    return true;
  }

  return /rate|quota|resource[_\s-]?exhausted|too many requests|unavailable|deadline exceeded|timeout/i.test(
    message,
  );
}

function getRetryDelayMs(error, attempt) {
  const message = String(error?.message || "");
  const fromMessage = message.match(/try again in ([\d.]+)s/i);
  if (fromMessage) {
    return Math.ceil(Number.parseFloat(fromMessage[1])) * 1000 + 500;
  }

  const exponential = BASE_RETRY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 300);
  return exponential + jitter;
}

function normalizeGeminiError(error) {
  if (error?.publicMessage && error?.status) {
    return error;
  }

  const message = String(error?.message || "").toLowerCase();

  if (/safety|blocked|policy/.test(message)) {
    return createPublicError(422, "O conteudo nao pode ser processado pelo modelo.", message);
  }

  if (/api key|unauthorized|permission|forbidden|401|403/.test(message)) {
    return createPublicError(502, "Falha de autenticacao com o provedor de IA.", message);
  }

  if (/429|rate|quota|resource[_\s-]?exhausted/.test(message)) {
    return createPublicError(
      429,
      "Limite temporario do provedor. Aguarde alguns segundos e tente novamente.",
      message,
    );
  }

  if (/503|unavailable|timeout|network|fetch failed|deadline exceeded/.test(message)) {
    return createPublicError(503, "Servico de IA temporariamente indisponivel.", message);
  }

  return createPublicError(502, "Falha ao gerar traducao no provedor.", message || "unknown error");
}

function createPublicError(status, publicMessage, internalMessage) {
  const error = new Error(internalMessage || publicMessage);
  error.status = status;
  error.publicMessage = publicMessage;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  callProvider,
  getPublicProviders,
};
