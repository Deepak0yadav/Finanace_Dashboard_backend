const { forbidden, unauthorized, validationError } = require("../utils/errors");
const { verifyPassword } = require("../utils/passwords");
const { toPublicUser } = require("../utils/serializers");
const { createToken, verifyToken } = require("../utils/tokens");
const { addError, isEmail, normalizeEmail } = require("../utils/validation");

function validateLoginInput(input) {
  const errors = [];
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";

  if (!isEmail(email)) {
    addError(errors, "email", "Email must be valid");
  }

  if (password.length === 0) {
    addError(errors, "password", "Password is required");
  }

  if (errors.length > 0) {
    throw validationError(errors);
  }

  return {
    email,
    password,
  };
}

function createAuthService({ config, usersRepository }) {
  async function login(input) {
    const validated = validateLoginInput(input);
    const user = await usersRepository.findByEmail(validated.email);

    if (!user) {
      throw unauthorized("Invalid email or password");
    }

    if (user.status !== "active") {
      throw forbidden("User account is inactive");
    }

    const passwordMatches = await verifyPassword(validated.password, user.passwordHash);
    if (!passwordMatches) {
      throw unauthorized("Invalid email or password");
    }

    return {
      token: createToken(
        {
          email: user.email,
          role: user.role,
          sub: user.id,
        },
        config.tokenSecret,
        config.tokenTtlSeconds,
      ),
      tokenType: "Bearer",
      expiresInSeconds: config.tokenTtlSeconds,
      user: toPublicUser(user),
    };
  }

  async function authenticateHeader(header) {
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Authentication required");
    }

    const token = header.slice(7).trim();
    let payload;

    try {
      payload = verifyToken(token, config.tokenSecret);
    } catch (_error) {
      throw unauthorized("Invalid or expired token");
    }

    const user = await usersRepository.findById(payload.sub);
    if (!user) {
      throw unauthorized("Invalid or expired token");
    }

    if (user.status !== "active") {
      throw forbidden("User account is inactive");
    }

    return user;
  }

  return {
    authenticateHeader,
    login,
  };
}

module.exports = {
  createAuthService,
};
