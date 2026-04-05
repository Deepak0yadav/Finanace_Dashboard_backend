function registerHealthRoutes(router, { config, recordsRepository, usersRepository }) {
  router.register("GET", "/", async (ctx) => {
    const [users, records] = await Promise.all([
      usersRepository.countAll(),
      recordsRepository.countAll(),
    ]);

    ctx.json(200, {
      name: "Finance Dashboard Backend",
      status: "running",
      storage: config.storageLabel,
      users,
      records,
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
