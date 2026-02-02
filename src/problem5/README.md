# My NestJS Project

A NestJS application for managing games and player gameplay records with Prisma ORM and SQLite database.

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
- **Database**: SQLite with Prisma ORM v7
- **Validation**: Typebox
- **API Documentation**: Swagger
- **Runtime**: Node.js / Bun

## Prerequisites

- Node.js 18+ or Bun
- npm, pnpm, or bun package manager

## Installation

```bash
# Install dependencies
npm install
# or
bun install
```

## Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL=file:./app.db
APPLY_MIGRATION_STARTUP=true
PORT=5000
```

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# View database (optional)
npx prisma studio
```

## Running the Application

```bash
# Development mode
npm run start

# Watch mode (auto-reload)
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run build
npm run start:prod
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
