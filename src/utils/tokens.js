const { createHmac, timingSafeEqual } = require("node:crypto");

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(unsignedToken, secret) {
  return createHmac("sha256", secret).update(unsignedToken).digest("base64url");
}

function createToken(payload, secret, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const completePayload = {
    ...payload,
    exp: issuedAt + ttlSeconds,
    iat: issuedAt,
  };

  const unsignedToken = `${encodeJson({ alg: "HS256", typ: "JWT" })}.${encodeJson(completePayload)}`;
  const signature = sign(unsignedToken, secret);

  return `${unsignedToken}.${signature}`;
}

function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }

  const [headerPart, payloadPart, signature] = parts;
  const unsignedToken = `${headerPart}.${payloadPart}`;
  const expectedSignature = sign(unsignedToken, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Token signature mismatch");
  }

  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw new Error("Token expired");
  }

  return payload;
}

module.exports = {
  createToken,
  verifyToken,
};
