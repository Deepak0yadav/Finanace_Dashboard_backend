function registerHealthRoutes(router, { config, store }) {
  router.register("GET", "/", async (ctx) => {
    ctx.json(200, {
      name: "Finance Dashboard Backend",
      status: "running",
      storage: config.dataFile,
      users: store.state.users.length,
      records: store.state.records.length,
    });
  });

  router.register("GET", "/health", async (ctx) => {
    ctx.json(200, {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
    });
  });
}

module.exports = {
  registerHealthRoutes,
};
