const { getPublicProviders } = require("./lib/providers");
const {
  applySecurityHeaders,
  enforceAppAccessKey,
  enforceRateLimit,
  enforceSameOrigin,
  sendError,
} = require("./lib/security");

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);

  if (!enforceSameOrigin(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    sendError(res, 405, "Metodo nao permitido.");
    return;
  }

  if (!enforceAppAccessKey(req, res)) {
    return;
  }

  if (
    !enforceRateLimit(req, res, {
      bucket: "providers",
      max: process.env.RATE_LIMIT_PROVIDERS_MAX || 120,
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60_000,
    })
  ) {
    return;
  }

  try {
    const payload = getPublicProviders();
    res.status(200).json(payload);
  } catch (error) {
    console.error("[providers] internal error", error);
    sendError(res, 500, "Falha ao consultar status do provedor.");
  }
};
