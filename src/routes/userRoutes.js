function registerUserRoutes(router, { guards, usersService }) {
  const adminOnly = guards.requireRoles(["admin"]);

  router.register(
    "GET",
    "/api/users",
    adminOnly(async (ctx) => {
      ctx.json(200, {
        data: await usersService.listUsers(),
      });
    }),
  );

  router.register(
    "GET",
    "/api/users/:id",
    adminOnly(async (ctx) => {
      ctx.json(200, {
        data: await usersService.getUserById(ctx.params.id),
      });
    }),
  );

  router.register(
    "POST",
    "/api/users",
    adminOnly(async (ctx) => {
      const body = await ctx.readJson();
      const user = await usersService.createUser(body);

      ctx.json(201, {
        data: user,
      });
    }),
  );

  router.register(
    "PATCH",
    "/api/users/:id",
    adminOnly(async (ctx) => {
      const body = await ctx.readJson();
      const user = await usersService.updateUser(ctx.params.id, body);

      ctx.json(200, {
        data: user,
      });
    }),
  );
}

module.exports = {
  registerUserRoutes,
};
