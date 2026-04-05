function registerAuthRoutes(router, { authService }) {
  router.register("POST", "/api/auth/login", async (ctx) => {
    const body = await ctx.readJson();
    const result = await authService.login(body);

    ctx.json(200, result);
  });
}

module.exports = {
  registerAuthRoutes,
};
