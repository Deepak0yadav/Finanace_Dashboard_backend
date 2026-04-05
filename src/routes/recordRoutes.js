function registerRecordRoutes(router, { guards, recordsService }) {
  const readRecords = guards.requireRoles(["viewer", "analyst", "admin"]);
  const adminOnly = guards.requireRoles(["admin"]);

  router.register(
    "GET",
    "/api/records",
    readRecords(async (ctx) => {
      ctx.json(200, recordsService.listRecords(ctx.query));
    }),
  );

  router.register(
    "GET",
    "/api/records/:id",
    readRecords(async (ctx) => {
      ctx.json(200, {
        data: recordsService.getRecordById(ctx.params.id),
      });
    }),
  );

  router.register(
    "POST",
    "/api/records",
    adminOnly(async (ctx) => {
      const body = await ctx.readJson();
      const record = await recordsService.createRecord(body, ctx.currentUser);

      ctx.json(201, {
        data: record,
      });
    }),
  );

  router.register(
    "PATCH",
    "/api/records/:id",
    adminOnly(async (ctx) => {
      const body = await ctx.readJson();
      const record = await recordsService.updateRecord(ctx.params.id, body);

      ctx.json(200, {
        data: record,
      });
    }),
  );

  router.register(
    "DELETE",
    "/api/records/:id",
    adminOnly(async (ctx) => {
      await recordsService.deleteRecord(ctx.params.id);
      ctx.noContent();
    }),
  );
}

module.exports = {
  registerRecordRoutes,
};
