const http = require("node:http");
const path = require("node:path");

const { DataStore } = require("./core/store");
const { createRouter } = require("./core/router");
const { createGuards } = require("./middleware/guards");
const { RecordsRepository } = require("./repositories/recordsRepository");
const { UsersRepository } = require("./repositories/usersRepository");
const { registerAuthRoutes } = require("./routes/authRoutes");
const { registerHealthRoutes } = require("./routes/healthRoutes");
const { registerRecordRoutes } = require("./routes/recordRoutes");
const { registerUserRoutes } = require("./routes/userRoutes");
const { createAuthService } = require("./services/authService");
const { createRecordsService } = require("./services/recordsService");
const { createUsersService } = require("./services/usersService");

function loadConfig(overrides = {}) {
  return {
    port: Number(overrides.port || process.env.PORT || 5000),
    dataFile:
      overrides.dataFile ||
      process.env.DATA_FILE ||
      path.join(process.cwd(), "data", "database.json"),
    tokenSecret: overrides.tokenSecret || process.env.TOKEN_SECRET || "local-development-secret",
    tokenTtlSeconds: Number(
      overrides.tokenTtlSeconds || process.env.TOKEN_TTL_SECONDS || 60 * 60 * 24,
    ),
    seedAdmin: {
      name: overrides.seedAdmin?.name || process.env.ADMIN_NAME || "System Admin",
      email: overrides.seedAdmin?.email || process.env.ADMIN_EMAIL || "admin@example.com",
      password: overrides.seedAdmin?.password || process.env.ADMIN_PASSWORD || "admin12345",
    },
  };
}

async function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  const store = new DataStore(config.dataFile);
  await store.load();

  const usersRepository = new UsersRepository(store);
  const recordsRepository = new RecordsRepository(store);

  const usersService = createUsersService({ usersRepository });
  await usersService.ensureSeedAdmin(config.seedAdmin);

  const authService = createAuthService({ config, usersRepository });
  const recordsService = createRecordsService({ recordsRepository, usersRepository });
  const guards = createGuards({ authService });

  const router = createRouter();
  registerHealthRoutes(router, { config, store });
  registerAuthRoutes(router, { authService });
  registerUserRoutes(router, { guards, usersService });
  registerRecordRoutes(router, { guards, recordsService });

  const handle = (req, res) =>
    router.handle(req, res, {
      config,
      recordsRepository,
      store,
      usersRepository,
    });

  return {
    config,
    createServer() {
      return http.createServer(handle);
    },
    handle,
    store,
  };
}

module.exports = {
  createApp,
  loadConfig,
};
