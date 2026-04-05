const { randomUUID } = require("node:crypto");

const { conflict, notFound, validationError } = require("../utils/errors");
const { hashPassword } = require("../utils/passwords");
const { toPublicUser } = require("../utils/serializers");
const {
  USER_ROLES,
  USER_STATUSES,
  addError,
  isEmail,
  normalizeEmail,
  normalizeString,
} = require("../utils/validation");

function validateCreateUser(input) {
  const errors = [];
  const name = normalizeString(input.name);
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role === undefined ? "viewer" : normalizeString(input.role).toLowerCase();
  const status = input.status === undefined ? "active" : normalizeString(input.status).toLowerCase();

  if (name.length < 2 || name.length > 80) {
    addError(errors, "name", "Name must be between 2 and 80 characters");
  }

  if (!isEmail(email)) {
    addError(errors, "email", "Email must be valid");
  }

  if (password.length < 8 || password.length > 128) {
    addError(errors, "password", "Password must be between 8 and 128 characters");
  }

  if (!USER_ROLES.includes(role)) {
    addError(errors, "role", "Role must be viewer, analyst, or admin");
  }

  if (!USER_STATUSES.includes(status)) {
    addError(errors, "status", "Status must be active or inactive");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return {
    email,
    name,
    password,
    role,
    status,
  };
}

function validateUpdateUser(input) {
  const errors = [];
  const updates = {};

  if (Object.keys(input).length === 0) {
    addError(errors, "body", "Provide at least one of name, role, or status");
  }

  if (Object.hasOwn(input, "name")) {
    const name = normalizeString(input.name);
    if (name.length < 2 || name.length > 80) {
      addError(errors, "name", "Name must be between 2 and 80 characters");
    } else {
      updates.name = name;
    }
  }

  if (Object.hasOwn(input, "role")) {
    const role = normalizeString(input.role).toLowerCase();
    if (!USER_ROLES.includes(role)) {
      addError(errors, "role", "Role must be viewer, analyst, or admin");
    } else {
      updates.role = role;
    }
  }

  if (Object.hasOwn(input, "status")) {
    const status = normalizeString(input.status).toLowerCase();
    if (!USER_STATUSES.includes(status)) {
      addError(errors, "status", "Status must be active or inactive");
    } else {
      updates.status = status;
    }
  }

  if (errors.length === 0 && Object.keys(updates).length === 0) {
    addError(errors, "body", "Provide at least one of name, role, or status");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return updates;
}

function createUsersService({ usersRepository }) {
  async function ensureSeedAdmin(seedAdmin) {
    if ((await usersRepository.countAll()) > 0) {
      return null;
    }

    const validatedSeed = validateCreateUser({
      ...seedAdmin,
      role: "admin",
      status: "active",
    });

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name: validatedSeed.name,
      email: validatedSeed.email,
      passwordHash: await hashPassword(validatedSeed.password),
      role: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await usersRepository.save(user);
    return toPublicUser(user);
  }

  async function createUser(input) {
    const validated = validateCreateUser(input);
    const existing = await usersRepository.findByEmail(validated.email);

    if (existing) {
      throw conflict("A user with that email already exists");
    }

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name: validated.name,
      email: validated.email,
      passwordHash: await hashPassword(validated.password),
      role: validated.role,
      status: validated.status,
      createdAt: now,
      updatedAt: now,
    };

    await usersRepository.save(user);
    return toPublicUser(user);
  }

  async function listUsers() {
    const users = await usersRepository.list();
    return users
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(toPublicUser);
  }

  async function getUserById(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw notFound("User not found");
    }

    return toPublicUser(user);
  }

  async function updateUser(userId, input) {
    const currentUser = await usersRepository.findById(userId);
    if (!currentUser) {
      throw notFound("User not found");
    }

    const updates = validateUpdateUser(input);
    const nextUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const isActiveAdminNow = currentUser.role === "admin" && currentUser.status === "active";
    const staysActiveAdmin = nextUser.role === "admin" && nextUser.status === "active";

    if (isActiveAdminNow && !staysActiveAdmin && (await usersRepository.countActiveAdmins()) === 1) {
      throw conflict("At least one active admin must remain in the system");
    }

    await usersRepository.save(nextUser);
    return toPublicUser(nextUser);
  }

  return {
    createUser,
    ensureSeedAdmin,
    getUserById,
    listUsers,
    updateUser,
  };
}

module.exports = {
  createUsersService,
};
