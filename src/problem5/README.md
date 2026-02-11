# My NestJS Project

A NestJS application for managing games and player gameplay records with Prisma ORM and PostgreSQL database.

## Project Structure

```
my-nest-project/
├── src/                              # Source code
│   ├── main.ts                       # Application entry point
│   ├── app.module.ts                 # Root application module
│   ├── modules/
│   │   ├── base/                     # Base service (shared)
│   │   │   └── base.service.ts
│   │   ├── games/                    # Games module (CRUD)
│   │   │   ├── games.module.ts
│   │   │   ├── games.controller.ts
│   │   │   ├── games.service.ts
│   │   │   └── games.schema.ts
│   │   ├── game-player/              # Game-Player relationship module
│   │   │   ├── game-player.module.ts
│   │   │   ├── game-player.controller.ts
│   │   │   ├── game-player.service.ts
│   │   │   └── game-player.schema.ts
│   │   └── prisma/                   # Database service
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── pipes/
│   │   └── typebox-validation.pipe.ts
│   └── utils/
│       └── slug.ts
├── prisma/                           # Database configuration
│   ├── schema.prisma                 # Prisma schema
│   ├── migrations/                   # Database migrations
│   └── generated/                    # Generated Prisma client
├── test/                             # E2E tests
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Technologies

- **Framework**: NestJS v11
- **Database**: PostgreSQL with Prisma ORM v7
- **Cache / Rate Limiting**: Redis
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
