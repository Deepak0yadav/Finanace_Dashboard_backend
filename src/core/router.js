const { URL } = require("node:url");

const { handleError, readJsonBody, sendJson, sendNoContent } = require("../utils/http");

function escapeSegment(segment) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  const pattern = parts
    .map((part) => {
      if (part.startsWith(":")) {
        const key = part.slice(1);
        return `(?<${key}>[^/]+)`;
      }

      return escapeSegment(part);
    })
    .join("/");

  return new RegExp(`^/${pattern}/?$`);
}

function createRouter() {
  const routes = [];

  function register(method, pathname, handler) {
    routes.push({
      method: method.toUpperCase(),
      pathname,
      matcher: compileRoute(pathname),
      handler,
    });
  }

  async function handle(req, res, baseContext) {
    const method = req.method.toUpperCase();
    const url = new URL(req.url, "http://127.0.0.1");
    let cachedBody;

    for (const route of routes) {
      if (route.method !== method) {
        continue;
      }

      const match = route.matcher.exec(url.pathname);
      if (!match) {
        continue;
      }

      const context = {
        ...baseContext,
        req,
        res,
        url,
        params: match.groups || {},
        query: Object.fromEntries(url.searchParams.entries()),
        readJson: async () => {
          if (cachedBody === undefined) {
            cachedBody = await readJsonBody(req);
          }

          return cachedBody;
        },
        json: (statusCode, payload) => sendJson(res, statusCode, payload),
        noContent: () => sendNoContent(res),
      };

      try {
        await route.handler(context);
      } catch (error) {
        handleError(res, error);
      }

      return;
    }

    sendJson(res, 404, {
      error: {
        code: "NOT_FOUND",
        message: `Route not found: ${method} ${url.pathname}`,
        details: [],
      },
    });
  }

  return {
    handle,
    register,
  };
}

module.exports = {
  createRouter,
};
