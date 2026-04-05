# Finance Dashboard Backend

A fresh backend implementation for the finance data processing and access control assignment.

This project is intentionally built with Node.js core modules and a JSON-backed data store instead of a large framework. The goal was to keep the code easy to review, easy to explain in an interview, and still structured around clear backend concerns like routing, services, persistence, validation, and role-based access control.

## Assignment Coverage

- User and role management for `viewer`, `analyst`, and `admin`
- Active and inactive user status handling
- Token-based authentication
- Role-based access control enforced at the backend layer
- Financial records CRUD APIs
- Filtering by type, category, date range, and keyword search
- Pagination for record listing
- Dashboard summary APIs for totals, category breakdown, monthly trends, and recent activity
- Input validation with structured error responses
- Persistent storage using a local JSON file
- Integration tests using the built-in Node.js test runner

## Tech Choices

- Runtime: Node.js 22+
- HTTP server: native `http` module
- Persistence: JSON file on disk
- Auth: signed bearer token using HMAC
- Password hashing: `crypto.scrypt`
- Tests: `node:test`

## Why This Approach

- No external runtime dependencies means the project can run immediately on a clean machine with Node installed.
- File-based persistence is enough for an assessment project and makes the data flow easy to inspect.
- Service and repository layers keep business rules separate from transport concerns.
- The custom router and guards show backend fundamentals directly instead of hiding them behind framework magic.

## Project Structure

```text
src/
  app.js
  server.js
  core/
  middleware/
  repositories/
  routes/
  services/
  utils/
tests/
```

## Setup

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Start the server:

```bash
node --env-file-if-exists=.env src/server.js
```

Optional scripts:

```bash
npm start
npm run dev
node --test
```

## Environment Variables

```env
PORT=5000
DATA_FILE=./data/database.json
TOKEN_SECRET=replace-this-secret
TOKEN_TTL_SECONDS=86400
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
```

On first boot, the application creates a seed admin user if the data file is empty.

## Default Access Model

- `viewer`: can read records
- `analyst`: can read records and dashboard analytics
- `admin`: can manage users and records

Additional safeguard:

- The last active admin cannot be downgraded or deactivated accidentally

## API Endpoints

### Public

- `GET /`
- `GET /health`
- `POST /api/auth/login`

### Users

- `GET /api/users` - admin
- `GET /api/users/:id` - admin
- `POST /api/users` - admin
- `PATCH /api/users/:id` - admin

### Records

- `GET /api/records` - viewer, analyst, admin
- `GET /api/records/:id` - viewer, analyst, admin
- `POST /api/records` - admin
- `PATCH /api/records/:id` - admin
- `DELETE /api/records/:id` - admin

Supported list filters:

- `type`
- `category`
- `search`
- `startDate`
- `endDate`
- `page`
- `limit`

### Dashboard

- `GET /api/dashboard/summary` - analyst, admin
- `GET /api/dashboard/categories` - analyst, admin
- `GET /api/dashboard/trends/monthly` - analyst, admin
- `GET /api/dashboard/activity/recent` - analyst, admin

Dashboard endpoints accept `startDate` and `endDate`, and recent activity also accepts `limit`.

## Example Requests

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin12345"
}
```

Create a record:

```http
POST /api/records
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 2500,
  "type": "income",
  "category": "Salary",
  "date": "2026-04-01",
  "notes": "Monthly payroll"
}
```

## Error Handling

Errors are returned in a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "date",
        "message": "Date must be in YYYY-MM-DD format"
      }
    ]
  }
}
```

## Tradeoffs and Assumptions

- The persistence layer is designed for single-instance local use, not multi-server production use.
- Record ownership is global to the finance dashboard, while write access is reserved for admins.
- A JSON data file was chosen for simplicity and portability within the assignment timeline.
- The token format is intentionally lightweight but still signed and expiry-aware.

## Test Coverage

The included integration tests cover:

- Admin login and seeded bootstrap flow
- User creation with role assignment
- Record creation and read/write permission boundaries
- Analyst access to dashboard summaries
- Protection against removing the last active admin
