const crypto = require("crypto");

const rateStore = new Map();

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
}

function sendError(res, statusCode, message) {
  res.status(statusCode).json({ error: message });
}

function enforceJsonRequest(req, res) {
  if (req.method !== "POST") {
    return true;
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    sendError(res, 415, "Content-Type deve ser application/json.");
    return false;
  }
  return true;
}

function enforceSameOrigin(req, res) {
  const allowedOrigin = normalizeOrigin(String(process.env.ALLOWED_ORIGIN || "").trim());
  if (!allowedOrigin) {
    return true;
  }

  const origin = normalizeOrigin(String(req.headers.origin || ""));
  if (!origin) {
    sendError(res, 403, "Origem nao permitida.");
    return false;
  }

  if (origin === allowedOrigin) {
    return true;
  }

  sendError(res, 403, "Origem nao permitida.");
  return false;
}

function enforceAppAccessKey(req, res) {
  const expected = String(process.env.APP_ACCESS_KEY || "").trim();
  if (!expected) {
    return true;
  }

  const provided = String(req.headers["x-app-key"] || "");
  if (!provided) {
    sendError(res, 401, "Acesso nao autorizado.");
    return false;
  }

  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) {
    sendError(res, 401, "Acesso nao autorizado.");
    return false;
  }

  if (!crypto.timingSafeEqual(left, right)) {
    sendError(res, 401, "Acesso nao autorizado.");
    return false;
  }

  return true;
}

function enforceRateLimit(req, res, options) {
  const bucket = options.bucket;
  const max = Number(options.max) || 30;
  const windowMs = Number(options.windowMs) || 60_000;
  const now = Date.now();

  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const current = rateStore.get(key);

  if (!current || now > current.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    current.count += 1;
    rateStore.set(key, current);
  }

  const active = rateStore.get(key);
  const remaining = Math.max(0, max - active.count);

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(active.resetAt / 1000)));

  cleanupRateStore(now);

  if (active.count > max) {
    sendError(res, 429, "Muitas requisicoes. Tente novamente em instantes.");
    return false;
  }

  return true;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return String(req.socket?.remoteAddress || "unknown");
}

function cleanupRateStore(now) {
  if (rateStore.size < 5000) {
    return;
  }

  for (const [key, entry] of rateStore.entries()) {
    if (now > entry.resetAt) {
      rateStore.delete(key);
    }
  }
}

function normalizeOrigin(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

module.exports = {
  applySecurityHeaders,
  enforceAppAccessKey,
  enforceJsonRequest,
  enforceRateLimit,
  enforceSameOrigin,
  sendError,
};
