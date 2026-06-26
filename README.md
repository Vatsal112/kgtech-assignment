# File Processing Service

A production-ready File Processing Service built with Node.js, TypeScript, Express, Redis, and BullMQ. Designed with Clean Architecture principles, full observability, and all assignment bonus features implemented.

## Features

- **Async Job Processing** — Submit file jobs, process them in the background via BullMQ
- **JWT Authentication** — Secure endpoints with access/refresh token flow
- **Rate Limiting** — Redis-backed, scalable rate limiting per route group
- **Request Validation** — Zod schemas with field-level error messages
- **CORS** — Configurable cross-origin support for frontend clients
- **Structured Logging** — Winston with console + rotating file transports
- **Swagger UI** — Interactive API docs at `/api-docs`
- **Bull Board** — Real-time queue monitoring at `/admin/queues`
- **AWS S3 Integration** — Pre-signed URL generation for direct uploads
- **Docker** — Multi-stage production Dockerfile + docker-compose
- **CI Pipeline** — GitHub Actions: lint, typecheck, build, unit tests, integration tests

## Assignment Coverage

This project implements all requirements from the technical assessment:

| Category       | Covered                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core stack** | Node.js, TypeScript, Express, Redis, BullMQ                                                                                                                            |
| **Functional** | Create job, async processing (5–10s), 20% failure simulation, 3 retries with exponential backoff, job status, queue stats, structured logging                          |
| **Bonus**      | JWT auth, rate limiting, Zod validation, unit + integration tests, GitHub Actions CI, Swagger, Bull Board, Winston logging, env config, Docker, AWS S3 pre-signed URLs |

> **Note:** All API routes are versioned under `/api/v1` (e.g. `POST /api/v1/jobs` instead of `POST /jobs`). Swagger UI and the tables below use the versioned paths.

## Architecture

```
src/
├── config/               # Zod-validated env config
├── core/
│   ├── redis/            # ioredis singleton
│   ├── queue/            # BullMQ Queue factory
│   ├── logger/           # Winston logger
│   ├── errors/           # AppError hierarchy
│   └── middleware/       # error-handler, auth, cors, rate-limit, validate
├── modules/
│   ├── auth/             # Register, login, refresh, logout
│   ├── jobs/             # Create/get jobs + BullMQ worker processor
│   ├── upload/           # S3 pre-signed URL
│   └── stats/            # Queue statistics
├── shared/               # Types, constants, utilities
├── infrastructure/
│   └── monitoring/       # Bull Board setup
├── swagger/              # OpenAPI spec
├── app.ts                # Express app composition
└── main.ts               # Bootstrap + graceful shutdown
tests/
├── unit/                 # Jest unit tests (mocked dependencies)
└── integration/          # Supertest integration tests (real Redis)
```

**Clean Architecture layers:**

1. **Domain** — Entities, enums, interfaces (`domain/`, `repository/*.interface.ts`)
2. **Application** — Use-case services (`service/`)
3. **Infrastructure** — Redis repositories, BullMQ processors (`repository/`, `processor/`)
4. **Presentation** — Controllers, routers, DTOs (`routes/`, `dto/`)

## Prerequisites

- Node.js >= 20
- Redis 7+
- Docker & Docker Compose (for containerized setup)
- (Optional) AWS credentials for S3 upload URL feature

## Installation

```bash
git clone <repo-url>
cd kgtech-assignment
npm install
cp .env.example .env
# Edit .env with your values (JWT secrets are required)
```

## Environment Variables

| Variable                 | Required | Default                                       | Description                                      |
| ------------------------ | -------- | --------------------------------------------- | ------------------------------------------------ |
| `PORT`                   | No       | `3000`                                        | HTTP server port                                 |
| `NODE_ENV`               | No       | `development`                                 | `development`, `production`, `test`              |
| `REDIS_URL`              | No       | `redis://localhost:6379`                      | Redis connection URL                             |
| `JWT_SECRET`             | **Yes**  | —                                             | JWT signing secret (min 16 chars)                |
| `JWT_REFRESH_SECRET`     | **Yes**  | —                                             | Refresh token signing secret                     |
| `JWT_EXPIRES_IN`         | No       | `15m`                                         | Access token TTL                                 |
| `JWT_REFRESH_EXPIRES_IN` | No       | `7d`                                          | Refresh token TTL                                |
| `AWS_REGION`             | No       | `us-east-1`                                   | AWS region for S3                                |
| `AWS_ACCESS_KEY_ID`      | No       | —                                             | AWS credentials (uses IAM role if omitted)       |
| `AWS_SECRET_ACCESS_KEY`  | No       | —                                             | AWS credentials                                  |
| `AWS_S3_BUCKET`          | No       | —                                             | S3 bucket name (required for `/upload-url`)      |
| `QUEUE_NAME`             | No       | `file-processing`                             | BullMQ queue name                                |
| `QUEUE_CONCURRENCY`      | No       | `5`                                           | Number of concurrent worker threads              |
| `CORS_ORIGIN`            | No       | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins; use `*` for all |
| `CORS_CREDENTIALS`       | No       | `true`                                        | Allow cookies / Authorization headers from CORS  |

## Running Locally

```bash
# 1. Start Redis (via Docker)
docker run -d -p 6379:6379 --name redis-local redis:7-alpine

# 2. Set env vars
cp .env.example .env
# Edit JWT_SECRET and JWT_REFRESH_SECRET in .env

# 3. Start in development mode (with hot reload)
npm run dev

# 4. Or build and run in production mode
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

## Running with Docker

```bash
# Copy and configure environment
cp .env.example .env
# Set JWT_SECRET and JWT_REFRESH_SECRET in .env

# Build and start both Redis and the app
docker compose up --build

# Run in background
docker compose up --build -d

# Verify containers are healthy
docker compose ps

# Smoke test
curl http://localhost:3000/health

# View logs
docker compose logs -f app

# Stop
docker compose down
```

> **Tip:** If you change dependencies or the Dockerfile, always rebuild with `--build` to avoid stale layers.

## API Endpoints

Base URL: `http://localhost:3000`

### Authentication

| Method | Path                    | Auth | Rate Limit  | Description              |
| ------ | ----------------------- | ---- | ----------- | ------------------------ |
| POST   | `/api/v1/auth/register` | No   | 10 / 15 min | Register new user        |
| POST   | `/api/v1/auth/login`    | No   | 10 / 15 min | Login, receive tokens    |
| POST   | `/api/v1/auth/refresh`  | No   | —           | Refresh access token     |
| POST   | `/api/v1/auth/logout`   | Yes  | —           | Invalidate refresh token |
| GET    | `/api/v1/auth/me`       | Yes  | —           | Get current user         |

### Jobs

| Method | Path               | Auth | Rate Limit | Description            |
| ------ | ------------------ | ---- | ---------- | ---------------------- |
| POST   | `/api/v1/jobs`     | Yes  | 60 / min   | Create and queue a job |
| GET    | `/api/v1/jobs/:id` | Yes  | 60 / min   | Get job status         |

### Stats & Upload

| Method | Path                 | Auth | Rate Limit | Description                |
| ------ | -------------------- | ---- | ---------- | -------------------------- |
| GET    | `/api/v1/stats`      | Yes  | 60 / min   | Queue statistics           |
| POST   | `/api/v1/upload-url` | Yes  | 10 / min   | Generate S3 pre-signed URL |

### Monitoring & Docs

| Path             | Description              |
| ---------------- | ------------------------ |
| `/api-docs`      | Swagger UI               |
| `/api-docs.json` | OpenAPI spec JSON        |
| `/admin/queues`  | Bull Board queue monitor |
| `/health`        | Health check             |

## Quick API Test Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"TestPass1"}'

# 2. Login — copy accessToken from response
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"TestPass1"}'

# 3. Create a job (replace TOKEN)
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"orders.csv","size":2048}'

# 4. Get job status (replace JOB_ID)
curl http://localhost:3000/api/v1/jobs/JOB_ID \
  -H "Authorization: Bearer TOKEN"

# 5. Queue stats
curl http://localhost:3000/api/v1/stats \
  -H "Authorization: Bearer TOKEN"
```

## Job Lifecycle

```
POST /api/v1/jobs → queued → active → completed
                                  ↓
                               failed (retried up to 3 times with exponential backoff)
```

- Processing simulates 5–10 seconds of work
- ~20% of jobs fail randomly to demonstrate retry handling
- Retry: 3 attempts with exponential backoff starting at 2 seconds
- Jobs expire from Redis after 24 hours

## Testing

```bash
# Lint + typecheck
npm run lint
npm run typecheck

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires Redis running)
npm run test:integration

# With coverage
npm run test:coverage
```

## Architecture Decisions

### Why Express over Fastify?

Express has the broadest ecosystem (Bull Board, rate-limit-redis, swagger-ui-express) and is the most universally understood. Fastify would offer marginally better raw performance but no meaningful advantage for this use case.

### Why Redis as the user store?

The assignment only specifies Redis as the data store. Using Redis for user storage avoids introducing a separate database dependency while keeping the stack simple. In production you'd typically use PostgreSQL for users.

### Why Zod for validation?

Zod provides superior TypeScript inference (inferred types, not just runtime checks), composable schemas, and better error messages than Joi. The parsed output type is automatically correct.

### Why JWT + refresh tokens?

Short-lived access tokens (15m) minimize exposure if leaked. Refresh tokens (7d) stored in Redis can be explicitly invalidated (logout), solving the statelessness limitation of pure JWT.

### Why separate Redis connection for app vs BullMQ?

BullMQ bundles its own ioredis version and requires `maxRetriesPerRequest: null` which conflicts with application-layer Redis usage. Using a URL string for BullMQ connections avoids type mismatches.

### Why `/api/v1` prefix?

Versioning keeps the API stable as endpoints evolve. All assignment endpoints are implemented under this prefix (e.g. `/api/v1/jobs` maps to the spec's `POST /jobs`).

### Scalability

- **Horizontal scaling**: BullMQ workers are stateless — run multiple worker processes pointing at the same Redis
- **Rate limiting**: Redis-backed store works correctly across multiple app instances
- **Queue reliability**: BullMQ's at-least-once delivery semantics + exponential backoff ensure jobs are not lost on worker crashes
- **Graceful shutdown**: Worker finishes in-progress jobs before exiting; SIGTERM is handled

## Git Commit Strategy

Commits are structured by feature:

1. `initial commit`
2. `feat: add config layer with Zod env validation`
3. `feat: add core infrastructure (Redis, logger, errors)`
4. `feat: implement auth module with JWT`
5. `feat: implement jobs module with BullMQ processor`
6. `feat: implement stats and upload modules`
7. `feat: add Swagger docs and Bull Board monitoring`
8. `test: add unit and integration tests`
9. `ci: add GitHub Actions pipeline`
10. `docs: write README`
