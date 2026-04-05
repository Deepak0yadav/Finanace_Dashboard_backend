const http = require("node:http");
const path = require("node:path");

const { createRouter } = require("./core/router");
const { DataStore } = require("./core/store");
const { registerHealthRoutes } = require("./routes/healthRoutes");

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

  const router = createRouter();
  registerHealthRoutes(router, { config, store });

  const handle = (req, res) => router.handle(req, res, { config, store });

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
