# ==========================================
# Stage 0: Base – install dependencies
# ==========================================
FROM oven/bun:1.3-debian AS base

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ==========================================
# Stage 1: Builder – generate Prisma & bundle
# ==========================================
FROM base AS builder

WORKDIR /app

COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY src ./src/
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Generate Prisma client (dummy URL – generate only reads the schema, no connection needed)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

# Bundle into a single JS file (externalize optional NestJS peer deps)
RUN bun build --minify --target bun --outfile ./dist/server.js src/main.ts \
    --external @nestjs/microservices \
    --external @nestjs/websockets \
    --external class-transformer \
    --external class-transformer/storage \
    --external class-validator

# ==========================================
# Stage 2: Runtime – distroless
# ==========================================
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

WORKDIR /app

# Copy bun binary
COPY --from=base /usr/local/bin/bun /usr/local/bin/bun

# Copy bundled app
COPY --from=builder --chown=65532:65532 /app/dist/server.js ./server.js

# Copy prisma assets (migrations + schema + config for migrate deploy)
COPY --from=builder --chown=65532:65532 /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=65532:65532 /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=65532:65532 /app/prisma.config.ts ./prisma.config.ts

# Copy generated prisma client (referenced by the bundle at runtime)
COPY --from=builder --chown=65532:65532 /app/prisma/generated ./prisma/generated

# Copy only runtime-needed packages (swagger-ui-dist has static assets read from disk at runtime)
COPY --from=builder --chown=65532:65532 /app/node_modules/swagger-ui-dist ./node_modules/swagger-ui-dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

ENTRYPOINT ["/usr/local/bin/bun"]
CMD ["./server.js"]
