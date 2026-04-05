class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function validationError(details) {
  return new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
}

function badRequest(message, details = []) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

function unauthorized(message) {
  return new AppError(401, "UNAUTHORIZED", message);
}

function forbidden(message) {
  return new AppError(403, "FORBIDDEN", message);
}

function notFound(message) {
  return new AppError(404, "NOT_FOUND", message);
}

function conflict(message) {
  return new AppError(409, "CONFLICT", message);
}

function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  AppError,
  badRequest,
  conflict,
  forbidden,
  isAppError,
  notFound,
  unauthorized,
  validationError,
};
