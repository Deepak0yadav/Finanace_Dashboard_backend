const { forbidden } = require("../utils/errors");

function createGuards({ authService }) {
  function requireAuth(handler) {
    return async (ctx) => {
      ctx.currentUser = await authService.authenticateHeader(ctx.req.headers.authorization);
      return handler(ctx);
    };
  }

  function requireRoles(roles) {
    return (handler) =>
      requireAuth(async (ctx) => {
        if (!roles.includes(ctx.currentUser.role)) {
          throw forbidden("You do not have permission to perform this action");
        }

        return handler(ctx);
      });
  }

  return {
    requireAuth,
    requireRoles,
  };
}

module.exports = {
  createGuards,
};
