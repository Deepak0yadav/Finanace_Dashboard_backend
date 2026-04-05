const { randomUUID } = require("node:crypto");

const { notFound, validationError } = require("../utils/errors");
const { toRecordResponse } = require("../utils/serializers");
const {
  RECORD_TYPES,
  addError,
  normalizeString,
  parseBoundedInteger,
  parseDateOnly,
  parsePositiveAmount,
  validateDateRange,
} = require("../utils/validation");

function validateRecordInput(input, isUpdate = false) {
  const errors = [];
  const fields = {};

  if (Object.keys(input).length === 0) {
    addError(
      errors,
      "body",
      isUpdate
        ? "Provide at least one record field to update"
        : "Request body cannot be empty",
    );
  }

  if (!isUpdate || Object.hasOwn(input, "amount")) {
    const amount = parsePositiveAmount(input.amount);
    if (amount === null) {
      addError(errors, "amount", "Amount must be a number greater than 0");
    } else {
      fields.amount = amount;
    }
  }

  if (!isUpdate || Object.hasOwn(input, "type")) {
    const type = normalizeString(input.type).toLowerCase();
    if (!RECORD_TYPES.includes(type)) {
      addError(errors, "type", "Type must be income or expense");
    } else {
      fields.type = type;
    }
  }

  if (!isUpdate || Object.hasOwn(input, "category")) {
    const category = normalizeString(input.category);
    if (category.length < 2 || category.length > 50) {
      addError(errors, "category", "Category must be between 2 and 50 characters");
    } else {
      fields.category = category;
    }
  }

  if (!isUpdate || Object.hasOwn(input, "date")) {
    const date = parseDateOnly(input.date);
    if (!date) {
      addError(errors, "date", "Date must be in YYYY-MM-DD format");
    } else {
      fields.date = date;
    }
  }

  if (!isUpdate || Object.hasOwn(input, "notes")) {
    const notes = input.notes === undefined ? "" : normalizeString(input.notes);
    if (notes.length > 300) {
      addError(errors, "notes", "Notes cannot be longer than 300 characters");
    } else {
      fields.notes = notes;
    }
  }

  if (errors.length === 0 && isUpdate && Object.keys(fields).length === 0) {
    addError(errors, "body", "Provide at least one record field to update");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return fields;
}

function validateListQuery(query) {
  const errors = [];
  const type = query.type === undefined ? null : normalizeString(query.type).toLowerCase();
  const category = query.category === undefined ? null : normalizeString(query.category);
  const search = query.search === undefined ? null : normalizeString(query.search);
  const page = query.page === undefined ? 1 : parseBoundedInteger(query.page, { min: 1 });
  const limit = query.limit === undefined ? 20 : parseBoundedInteger(query.limit, { min: 1, max: 100 });
  const { startDate, endDate } = validateDateRange(query.startDate, query.endDate, errors);

  if (type && !RECORD_TYPES.includes(type)) {
    addError(errors, "type", "Type must be income or expense");
  }

  if (query.page !== undefined && page === null) {
    addError(errors, "page", "Page must be an integer greater than or equal to 1");
  }

  if (query.limit !== undefined && limit === null) {
    addError(errors, "limit", "Limit must be an integer between 1 and 100");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return {
    category,
    endDate,
    limit,
    page,
    search,
    startDate,
    type,
  };
}

function matchesRecord(record, filters) {
  if (filters.type && record.type !== filters.type) {
    return false;
  }

  if (filters.category && record.category.toLowerCase() !== filters.category.toLowerCase()) {
    return false;
  }

  if (filters.startDate && record.date < filters.startDate) {
    return false;
  }

  if (filters.endDate && record.date > filters.endDate) {
    return false;
  }

  if (filters.search) {
    const haystack = `${record.category} ${record.notes}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function sortRecords(left, right) {
  if (left.date === right.date) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return right.date.localeCompare(left.date);
}

function createRecordsService({ recordsRepository, usersRepository }) {
  async function createRecord(input, actor) {
    const fields = validateRecordInput(input, false);
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      amount: fields.amount,
      type: fields.type,
      category: fields.category,
      date: fields.date,
      notes: fields.notes,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await recordsRepository.save(record);
    return toRecordResponse(record, usersRepository);
  }

  async function listRecords(query) {
    const filters = validateListQuery(query);
    const records = (await recordsRepository.list())
      .filter((record) => matchesRecord(record, filters))
      .sort(sortRecords);

    const total = records.length;
    const startIndex = (filters.page - 1) * filters.limit;
    const pageData = await Promise.all(
      records
        .slice(startIndex, startIndex + filters.limit)
        .map((record) => toRecordResponse(record, usersRepository)),
    );

    return {
      data: pageData,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }

  async function getRecordById(recordId) {
    const record = await recordsRepository.findById(recordId);
    if (!record) {
      throw notFound("Financial record not found");
    }

    return toRecordResponse(record, usersRepository);
  }

  async function updateRecord(recordId, input) {
    const currentRecord = await recordsRepository.findById(recordId);
    if (!currentRecord) {
      throw notFound("Financial record not found");
    }

    const fields = validateRecordInput(input, true);
    const nextRecord = {
      ...currentRecord,
      ...fields,
      updatedAt: new Date().toISOString(),
    };

    await recordsRepository.save(nextRecord);
    return toRecordResponse(nextRecord, usersRepository);
  }

  async function deleteRecord(recordId) {
    const deleted = await recordsRepository.remove(recordId);
    if (!deleted) {
      throw notFound("Financial record not found");
    }
  }

  return {
    createRecord,
    deleteRecord,
    getRecordById,
    listRecords,
    updateRecord,
  };
}

module.exports = {
  createRecordsService,
};
