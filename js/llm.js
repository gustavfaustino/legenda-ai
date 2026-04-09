const API_BASE = "/api";
const FALLBACK_RETRY_MS = 10000;
const GEMINI_PROVIDER = "gemini";

export async function fetchProviders() {
  const response = await fetch(`${API_BASE}/providers`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível carregar provedores.");
  }

  const gemini = (data.providers || []).find((provider) => provider.id === GEMINI_PROVIDER);

  return {
    defaultProvider: GEMINI_PROVIDER,
    providers: [
      {
        id: GEMINI_PROVIDER,
        label: "Gemini 2.5 Flash",
        defaultModel: gemini?.defaultModel || "gemini-2.5-flash",
        enabled: Boolean(gemini?.enabled),
      },
    ],
  };
}

export async function callLLM({ prompt }) {
  const response = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      providerName: GEMINI_PROVIDER,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Falha ao chamar provedor Gemini.");
  }

  return data.text || "";
}

export function parseRetryMs(message, fallbackMs = FALLBACK_RETRY_MS) {
  const matched = message.match(/try again in ([\d.]+)s/i);
  if (!matched) {
    return fallbackMs;
  }

  return Math.ceil(Number.parseFloat(matched[1])) * 1000 + 1000;
}
