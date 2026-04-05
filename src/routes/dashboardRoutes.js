function registerDashboardRoutes(router, { dashboardService, guards }) {
  const analystOrAdmin = guards.requireRoles(["analyst", "admin"]);

  router.register(
    "GET",
    "/api/dashboard/summary",
    analystOrAdmin(async (ctx) => {
      ctx.json(200, {
        data: await dashboardService.getSummary(ctx.query),
      });
    }),
  );

  router.register(
    "GET",
    "/api/dashboard/categories",
    analystOrAdmin(async (ctx) => {
      ctx.json(200, {
        data: await dashboardService.getCategoryBreakdown(ctx.query),
      });
    }),
  );

  router.register(
    "GET",
    "/api/dashboard/trends/monthly",
    analystOrAdmin(async (ctx) => {
      ctx.json(200, {
        data: await dashboardService.getMonthlyTrends(ctx.query),
      });
    }),
  );

  router.register(
    "GET",
    "/api/dashboard/activity/recent",
    analystOrAdmin(async (ctx) => {
      ctx.json(200, {
        data: await dashboardService.getRecentActivity(ctx.query),
      });
    }),
  );
}

module.exports = {
  registerDashboardRoutes,
};
