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
    throw new Error("Somente Gemini 2.5 Flash e suportado.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada no servidor.");
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
      throw new Error("Resposta vazia do Gemini.");
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

      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        break;
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

  return /rate|quota|resource[_\s-]?exhausted|too many requests|unavailable/i.test(message);
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
  const message = String(error?.message || "Falha ao processar com Gemini.");
  return new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  callProvider,
  getPublicProviders,
};

