const { createApp } = require("./app");

async function startServer() {
  const app = await createApp();
  const server = app.createServer();

  server.listen(app.config.port, () => {
    console.log(`Server listening on http://127.0.0.1:${app.config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
