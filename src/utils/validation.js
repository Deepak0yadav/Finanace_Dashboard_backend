const USER_ROLES = ["viewer", "analyst", "admin"];
const USER_STATUSES = ["active", "inactive"];
const RECORD_TYPES = ["income", "expense"];

function addError(errors, field, message) {
  errors.push({ field, message });
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parsePositiveAmount(value) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function parseDateOnly(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

function parseBoundedInteger(value, options) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return null;
  }

  if (number < options.min) {
    return null;
  }

  if (options.max !== undefined && number > options.max) {
    return null;
  }

  return number;
}

function validateDateRange(startInput, endInput, errors, startField = "startDate", endField = "endDate") {
  const startDate = startInput === undefined ? null : parseDateOnly(startInput);
  const endDate = endInput === undefined ? null : parseDateOnly(endInput);

  if (startInput !== undefined && !startDate) {
    addError(errors, startField, `${startField} must be a valid date in YYYY-MM-DD format`);
  }

  if (endInput !== undefined && !endDate) {
    addError(errors, endField, `${endField} must be a valid date in YYYY-MM-DD format`);
  }

  if (startDate && endDate && startDate > endDate) {
    addError(errors, "dateRange", `${startField} must be before or equal to ${endField}`);
  }

  return {
    endDate,
    startDate,
  };
}

module.exports = {
  RECORD_TYPES,
  USER_ROLES,
  USER_STATUSES,
  addError,
  isEmail,
  normalizeEmail,
  normalizeString,
  parseBoundedInteger,
  parseDateOnly,
  parsePositiveAmount,
  validateDateRange,
};
