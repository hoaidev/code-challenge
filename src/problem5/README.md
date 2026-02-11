# My NestJS Project

A NestJS application for managing games and player gameplay records with Prisma ORM and PostgreSQL database.

## Project Structure

```
my-nest-project/
├── src/
│   ├── main.ts                       # Application entry point
│   ├── app.module.ts                 # Root application module
│   ├── telemetry/                    # OpenTelemetry observability
│   │   ├── telemetry.ts              # OTel SDK init (conditional)
│   │   ├── otel-logger.service.ts    # NestJS Logger -> OTel Logs bridge
│   │   └── otel-logger.module.ts     # Global logger module
│   ├── interceptors/
│   │   └── tracing.interceptor.ts    # HTTP request span creation
│   ├── filters/
│   │   └── http-exception.filter.ts  # Global exception handler
│   ├── modules/
│   │   ├── base/                     # Base service (shared)
│   │   ├── games/                    # Games module (CRUD)
│   │   ├── game-player/              # Game-Player relationship module
│   │   └── prisma/                   # Database service (with query tracing)
│   ├── pipes/
│   │   └── typebox-validation.pipe.ts
│   └── utils/
│       └── slug.ts
├── prisma/                           # Database configuration
│   ├── schema.prisma
│   ├── migrations/
│   └── generated/
├── otel-collector-config.yml         # OTel Collector pipeline config
├── tempo-config.yml                  # Grafana Tempo trace storage config
├── grafana-datasources.yml           # Grafana datasource provisioning
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Technologies

- **Framework**: NestJS v11
- **Database**: PostgreSQL with Prisma ORM v7
- **Cache / Rate Limiting**: Redis
- **Observability**: OpenTelemetry (traces + logs) → Grafana Tempo & Loki
- **Validation**: Typebox
- **API Documentation**: Swagger
- **Runtime**: Node.js / Bun

## Prerequisites

- Docker and Docker Compose

## Running with Docker (Recommended)

Start the entire stack (PostgreSQL, Redis, and the app) with a single command:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (host) → `5432` (container)
- **Redis** on port `9379` (host) → `6379` (container)
- **App** on port `5000`
- **OTel Collector** on port `4318` (OTLP HTTP receiver)
- **Loki** on port `3100` (log storage)
- **Tempo** on port `3200` (trace storage)
- **Grafana** on port `30000` (dashboards)

Database migrations are applied automatically on startup.

To stop the stack:

```bash
docker compose down
```

To rebuild after code changes:

```bash
docker compose up -d --build
```

To view logs:

```bash
docker compose logs -f app
```

### Environment Variables

The following environment variables are configured in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/problem5` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `PORT` | `5000` | Application port |
| `APPLY_MIGRATION_STARTUP` | `true` | Auto-run Prisma migrations on startup |
| `THROTTLE_LIMIT` | `10` | Rate limit: max requests per window |
| `THROTTLE_TTL` | `60` | Rate limit: window duration in seconds |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | OTel Collector endpoint (enables observability) |
| `OTEL_SERVICE_NAME` | `problem5-api` | Service name in traces and logs |

## Observability

OpenTelemetry is enabled automatically when running with Docker Compose (via `OTEL_EXPORTER_OTLP_ENDPOINT`). In development mode, OTel is skipped and only console logging is used.

### Grafana

Access Grafana at `http://localhost:30000` (default credentials: `admin` / `admin`).

Loki and Tempo datasources are auto-provisioned with log-to-trace correlation.

### Traces (Tempo)

Go to **Explore → Tempo → Search** to view distributed traces. Each HTTP request generates a trace with nested spans:

```
HTTP GET /games (TracingInterceptor)
└── prisma:Game.findMany (Prisma query tracing)
```

### Logs (Loki)

Go to **Explore → Loki** and query:

```
{service_name="problem5-api"}
```

Each log entry includes `trace_id` and `span_id` for correlation. Click a trace ID to jump to the Tempo trace view.

## Development Mode

Start PostgreSQL/Redis via Docker and run the app locally with hot-reload:

```bash
./start.dev.sh
```

This script will:
1. Start PostgreSQL and Redis containers if not already running
2. Run the app in watch mode (`bun run start:dev`)

### Prerequisites

- Bun or NodeJS
- Docker and Docker Compose

### Installation

```bash
bun install
```

The application runs on `http://localhost:5000` by default.

## API Documentation

Swagger documentation is available at `http://localhost:5000/api` when the application is running.

### API Endpoints

#### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/games` | Create a new game |
| GET | `/games` | List all games (supports filtering) |
| GET | `/games/:slug` | Get a game by slug |
| PATCH | `/games/:slug` | Update a game |
| DELETE | `/games/:slug` | Soft delete a game |

**Query Parameters for GET /games:**
- `name` - Filter by name (partial match)
- `status` - Filter by status (PUBLISHED, DRAFT, ARCHIVED)
- `type` - Filter by type (SINGLE_PLAYER, MULTIPLAYER)
- `genre` - Filter by genre (ACTION, ADVENTURE, ROLE_PLAYING, STRATEGY)
- `limit` - Number of results (default: 10)
- `offset` - Pagination offset (default: 0)

#### Game Player

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/game-player` | Record a player playing a game |
| GET | `/game-player` | List all gameplay records |

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run start` | Start in development mode |
| `npm run start:dev` | Start with watch mode |
| `npm run start:debug` | Start with debug mode |
| `npm run start:prod` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |

## License

MIT
