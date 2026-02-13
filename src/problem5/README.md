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
│   ├── decorators/
│   │   └── cache.decorators.ts       # @Cached / @InvalidateCache decorators
│   ├── interceptors/
│   │   ├── http-cache.interceptor.ts # Global Redis cache interceptor
│   │   └── tracing.interceptor.ts    # HTTP request span creation
│   ├── filters/
│   │   └── http-exception.filter.ts  # Global exception handler
│   ├── modules/
│   │   ├── base/                     # Base service (shared)
│   │   ├── games/                    # Games module (CRUD)
│   │   ├── game-player/              # Game-Player relationship module
│   │   ├── prisma/                   # Database service (with query tracing)
│   │   └── redis/                    # Redis client + cache service (global)
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
| `CACHE_GAMES_TTL` | `60` | Cache TTL for game endpoints (seconds) |
| `CACHE_GAME_PLAYER_TTL` | `30` | Cache TTL for game-player endpoints (seconds) |
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

## Caching

Redis-backed response caching is implemented via a global `HttpCacheInterceptor` driven by two decorators:

- **`@Cached({ prefix, ttl, paramKey? })`** — applied to GET handlers. Builds a cache key from the prefix and sorted query params (or a route param when `paramKey` is set). Returns cached responses on hit; caches the DB result on miss.
- **`@InvalidateCache(...patterns)`** — applied to mutation handlers (POST/PATCH/DELETE). Invalidates matching cache keys after a successful response. Patterns support `:paramName` placeholders resolved from route params (e.g. `'games:detail::slug'`).

### Cache Keys

| Pattern | Example | TTL |
|---|---|---|
| `games:list:{params}` | `games:list:genre=ACTION&status=PUBLISHED` | 60s |
| `games:detail:{slug}` | `games:detail:alpha-strike-x8f3k2` | 60s |
| `game-player:list:{params}` | `game-player:list:limit=10&offset=0` | 30s |

### Invalidation

| Mutation | Patterns Invalidated |
|---|---|
| `POST /games` | `games:list:*` |
| `PATCH /games/:slug` | `games:detail:{slug}` + `games:list:*` |
| `DELETE /games/:slug` | `games:detail:{slug}` + `games:list:*` |
| `POST /game-player` | `game-player:list:*` |

Pattern deletion uses `SCAN` (non-blocking) rather than `KEYS`.

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
bun run test

# Watch mode
bun run test:watch

# Test coverage
bun run test:cov

# E2E tests (starts dev server + Docker services, runs tests, generates report)
./start.e2e.sh
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Compile TypeScript |
| `bun run start` | Start in development mode |
| `bun run start:dev` | Start with watch mode |
| `bun run start:debug` | Start with debug mode |
| `bun run start:prod` | Run production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |
| `bun run test` | Run unit tests |
| `bun run test:e2e` | Run E2E tests |

## License

MIT
