const { AppError, isAppError } = require("./errors");

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (rawBody.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("Body must be a JSON object");
    }

    return parsed;
  } catch (_error) {
    throw new AppError(400, "INVALID_JSON", "Request body must be a valid JSON object");
  }
}

function sendJson(res, statusCode, payload) {
  if (res.writableEnded) {
    return;
  }

  const body = JSON.stringify(payload, null, 2);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

function sendNoContent(res) {
  if (res.writableEnded) {
    return;
  }

  res.statusCode = 204;
  res.end();
}

function handleError(res, error) {
  if (res.writableEnded) {
    return;
  }

  const safeError = isAppError(error)
    ? error
    : new AppError(500, "INTERNAL_SERVER_ERROR", "Something went wrong");

  sendJson(res, safeError.statusCode, {
    error: {
      code: safeError.code,
      message: safeError.message,
      details: safeError.details,
    },
  });
}

module.exports = {
  handleError,
  readJsonBody,
  sendJson,
  sendNoContent,
};
