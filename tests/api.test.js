const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createApp } = require("../src/app");

async function createTestServer() {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "finance-dashboard-"));
  const dataFile = path.join(tempDirectory, "database.json");
  const app = await createApp({
    dataFile,
    tokenSecret: "test-secret",
    seedAdmin: {
      name: "Test Admin",
      email: "admin@example.com",
      password: "admin12345",
    },
  });

  const server = http.createServer(app.handle);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await app.close();
      await fs.rm(tempDirectory, { recursive: true, force: true });
    },
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function request(baseUrl, pathname, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  return {
    body: text ? JSON.parse(text) : null,
    status: response.status,
  };
}

test("admin can manage users and records while analyst can access dashboard data", async (t) => {
  const server = await createTestServer();
  t.after(async () => {
    await server.close();
  });

  const adminLogin = await request(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@example.com",
      password: "admin12345",
    }),
  });

  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.token;

  const analystResponse = await request(server.baseUrl, "/api/users", {
    method: "POST",
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: "Asha Analyst",
      email: "analyst@example.com",
      password: "analyst12345",
      role: "analyst",
    }),
  });

  const viewerResponse = await request(server.baseUrl, "/api/users", {
    method: "POST",
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: "Vikram Viewer",
      email: "viewer@example.com",
      password: "viewer12345",
      role: "viewer",
    }),
  });

  assert.equal(analystResponse.status, 201);
  assert.equal(viewerResponse.status, 201);

  const incomeRecord = await request(server.baseUrl, "/api/records", {
    method: "POST",
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 2000,
      type: "income",
      category: "Salary",
      date: "2026-04-01",
      notes: "Primary salary",
    }),
  });

  const expenseRecord = await request(server.baseUrl, "/api/records", {
    method: "POST",
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 500,
      type: "expense",
      category: "Rent",
      date: "2026-04-02",
      notes: "April rent",
    }),
  });

  assert.equal(incomeRecord.status, 201);
  assert.equal(expenseRecord.status, 201);

  const viewerLogin = await request(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "viewer@example.com",
      password: "viewer12345",
    }),
  });

  const viewerWriteAttempt = await request(server.baseUrl, "/api/records", {
    method: "POST",
    headers: {
      authorization: `Bearer ${viewerLogin.body.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      type: "expense",
      category: "Food",
      date: "2026-04-03",
    }),
  });

  assert.equal(viewerWriteAttempt.status, 403);

  const analystLogin = await request(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "analyst@example.com",
      password: "analyst12345",
    }),
  });

  const analystToken = analystLogin.body.token;
  const summary = await request(server.baseUrl, "/api/dashboard/summary", {
    headers: {
      authorization: `Bearer ${analystToken}`,
    },
  });
  const categories = await request(server.baseUrl, "/api/dashboard/categories", {
    headers: {
      authorization: `Bearer ${analystToken}`,
    },
  });
  const monthlyTrends = await request(server.baseUrl, "/api/dashboard/trends/monthly", {
    headers: {
      authorization: `Bearer ${analystToken}`,
    },
  });
  const recentActivity = await request(server.baseUrl, "/api/dashboard/activity/recent?limit=2", {
    headers: {
      authorization: `Bearer ${analystToken}`,
    },
  });

  assert.equal(summary.status, 200);
  assert.equal(summary.body.data.totalIncome, 2000);
  assert.equal(summary.body.data.totalExpenses, 500);
  assert.equal(summary.body.data.netBalance, 1500);

  assert.equal(categories.status, 200);
  assert.equal(categories.body.data.length, 2);
  assert.deepEqual(categories.body.data[0], {
    category: "Rent",
    expense: 500,
    income: 0,
    net: -500,
  });
  assert.deepEqual(categories.body.data[1], {
    category: "Salary",
    expense: 0,
    income: 2000,
    net: 2000,
  });

  assert.equal(monthlyTrends.status, 200);
  assert.deepEqual(monthlyTrends.body.data, [
    {
      month: "2026-04",
      expense: 500,
      income: 2000,
      net: 1500,
    },
  ]);

  assert.equal(recentActivity.status, 200);
  assert.equal(recentActivity.body.data.length, 2);
});

test("the final active admin cannot be downgraded or deactivated", async (t) => {
  const server = await createTestServer();
  t.after(async () => {
    await server.close();
  });

  const adminLogin = await request(server.baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@example.com",
      password: "admin12345",
    }),
  });

  const response = await request(
    server.baseUrl,
    `/api/users/${adminLogin.body.user.id}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${adminLogin.body.token}`,
      },
      body: JSON.stringify({
        status: "inactive",
      }),
    },
  );

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "CONFLICT");
});
