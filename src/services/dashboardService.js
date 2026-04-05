const { validationError } = require("../utils/errors");
const { toRecordResponse } = require("../utils/serializers");
const { addError, parseBoundedInteger, validateDateRange } = require("../utils/validation");

function sortRecords(left, right) {
  if (left.date === right.date) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return right.date.localeCompare(left.date);
}

function roundAmount(value) {
  return Number(value.toFixed(2));
}

function validateDashboardQuery(query) {
  const errors = [];
  const { startDate, endDate } = validateDateRange(query.startDate, query.endDate, errors);
  const limit = query.limit === undefined ? 5 : parseBoundedInteger(query.limit, { min: 1, max: 20 });

  if (query.limit !== undefined && limit === null) {
    addError(errors, "limit", "Limit must be an integer between 1 and 20");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return {
    endDate,
    limit,
    startDate,
  };
}

function filterRecords(records, filters) {
  return records.filter((record) => {
    if (filters.startDate && record.date < filters.startDate) {
      return false;
    }

    if (filters.endDate && record.date > filters.endDate) {
      return false;
    }

    return true;
  });
}

function createDashboardService({ recordsRepository, usersRepository }) {
  function getSummary(query) {
    const filters = validateDashboardQuery(query);
    const records = filterRecords(recordsRepository.list(), filters);
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const record of records) {
      if (record.type === "income") {
        totalIncome += record.amount;
      } else {
        totalExpenses += record.amount;
      }
    }

    return {
      totalIncome: roundAmount(totalIncome),
      totalExpenses: roundAmount(totalExpenses),
      netBalance: roundAmount(totalIncome - totalExpenses),
      recordCount: records.length,
    };
  }

  function getCategoryBreakdown(query) {
    const filters = validateDashboardQuery(query);
    const records = filterRecords(recordsRepository.list(), filters);
    const categoryMap = new Map();

    for (const record of records) {
      const key = record.category.toLowerCase();
      const existing = categoryMap.get(key) || {
        category: record.category,
        expense: 0,
        income: 0,
      };

      if (record.type === "income") {
        existing.income += record.amount;
      } else {
        existing.expense += record.amount;
      }

      categoryMap.set(key, existing);
    }

    return Array.from(categoryMap.values())
      .map((entry) => ({
        category: entry.category,
        expense: roundAmount(entry.expense),
        income: roundAmount(entry.income),
        net: roundAmount(entry.income - entry.expense),
      }))
      .sort((left, right) => left.category.localeCompare(right.category));
  }

  function getMonthlyTrends(query) {
    const filters = validateDashboardQuery(query);
    const records = filterRecords(recordsRepository.list(), filters);
    const monthMap = new Map();

    for (const record of records) {
      const key = record.date.slice(0, 7);
      const existing = monthMap.get(key) || {
        expense: 0,
        income: 0,
        month: key,
      };

      if (record.type === "income") {
        existing.income += record.amount;
      } else {
        existing.expense += record.amount;
      }

      monthMap.set(key, existing);
    }

    return Array.from(monthMap.values())
      .map((entry) => ({
        month: entry.month,
        expense: roundAmount(entry.expense),
        income: roundAmount(entry.income),
        net: roundAmount(entry.income - entry.expense),
      }))
      .sort((left, right) => left.month.localeCompare(right.month));
  }

  function getRecentActivity(query) {
    const filters = validateDashboardQuery(query);
    const records = filterRecords(recordsRepository.list(), filters)
      .sort(sortRecords)
      .slice(0, filters.limit);

    return records.map((record) => toRecordResponse(record, usersRepository));
  }

  return {
    getCategoryBreakdown,
    getMonthlyTrends,
    getRecentActivity,
    getSummary,
  };
}

module.exports = {
  createDashboardService,
};
