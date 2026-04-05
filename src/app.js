const http = require("node:http");
const path = require("node:path");

const { MongoStore } = require("./core/mongoStore");
const { DataStore } = require("./core/store");
const { createRouter } = require("./core/router");
const { createGuards } = require("./middleware/guards");
const { RecordsRepository } = require("./repositories/recordsRepository");
const { UsersRepository } = require("./repositories/usersRepository");
const { registerAuthRoutes } = require("./routes/authRoutes");
const { registerDashboardRoutes } = require("./routes/dashboardRoutes");
const { registerHealthRoutes } = require("./routes/healthRoutes");
const { registerRecordRoutes } = require("./routes/recordRoutes");
const { registerUserRoutes } = require("./routes/userRoutes");
const { createAuthService } = require("./services/authService");
const { createDashboardService } = require("./services/dashboardService");
const { createRecordsService } = require("./services/recordsService");
const { createUsersService } = require("./services/usersService");

function loadConfig(overrides = {}) {
  const mongoUri = overrides.mongoUri || process.env.MONGODB_URI || "";
  const useMongo =
    overrides.useMongo !== undefined
      ? Boolean(overrides.useMongo)
      : String(process.env.USE_MONGODB || "").toLowerCase() === "true" || Boolean(mongoUri);

  return {
    port: Number(overrides.port || process.env.PORT || 5000),
    useMongo,
    mongoUri,
    mongoDbName: overrides.mongoDbName || process.env.MONGODB_DB || "finance_dashboard",
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
    storageLabel: useMongo
      ? `mongodb:${overrides.mongoDbName || process.env.MONGODB_DB || "finance_dashboard"}`
      : overrides.dataFile || process.env.DATA_FILE || path.join(process.cwd(), "data", "database.json"),
  };
}

async function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  if (config.useMongo && !config.mongoUri) {
    throw new Error("MONGODB_URI is required when MongoDB mode is enabled");
  }

  const store = config.useMongo
    ? new MongoStore({ uri: config.mongoUri, dbName: config.mongoDbName })
    : new DataStore(config.dataFile);

  await store.load();

  const usersRepository = new UsersRepository(store);
  const recordsRepository = new RecordsRepository(store);

  const usersService = createUsersService({ usersRepository });
  await usersService.ensureSeedAdmin(config.seedAdmin);

  const authService = createAuthService({ config, usersRepository });
  const recordsService = createRecordsService({ recordsRepository, usersRepository });
  const dashboardService = createDashboardService({ recordsRepository, usersRepository });
  const guards = createGuards({ authService });

  const router = createRouter();
  registerHealthRoutes(router, { config, recordsRepository, usersRepository });
  registerAuthRoutes(router, { authService });
  registerUserRoutes(router, { guards, usersService });
  registerRecordRoutes(router, { guards, recordsService });
  registerDashboardRoutes(router, { dashboardService, guards });

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
    async close() {
      await store.close();
    },
    store,
  };
}

module.exports = {
  createApp,
  loadConfig,
};
