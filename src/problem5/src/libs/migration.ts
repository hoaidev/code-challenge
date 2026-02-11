/**
 * Lightweight migration runner for PostgreSQL
 * Replaces the need for Prisma CLI at runtime (~160MB savings)
 */

import { readdir, readFile } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import path from 'node:path';
import { PrismaClient } from '@/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Apply pending migrations using raw SQL
 * Compatible with Prisma's _prisma_migrations table format
 */
export async function applyMigrations() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      new Pool({ connectionString: process.env.DATABASE_URL!, max: 10 }),
    ),
  });
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');

  // Ensure _prisma_migrations table exists (PostgreSQL syntax)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Get applied migrations
  const applied = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
  );
  const appliedNames = new Set(applied.map((m) => m.migration_name));

  // Read migration directories
  let migrationDirs: string[];
  try {
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    migrationDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    Logger.log('No migrations directory found, skipping migrations');
    return;
  }

  // Apply pending migrations
  let appliedCount = 0;
  for (const dirName of migrationDirs) {
    if (appliedNames.has(dirName)) {
      continue;
    }

    const sqlPath = path.join(migrationsDir, dirName, 'migration.sql');
    let sql: string;
    try {
      sql = await readFile(sqlPath, 'utf-8');
    } catch {
      Logger.error(`Migration file not found: ${sqlPath}`);
      continue;
    }

    Logger.log(`Applying migration: ${dirName}`);
    const startedAt = new Date().toISOString();

    try {
      // Execute the entire migration as a single transaction
      // PostgreSQL handles multi-statement execution properly
      await prisma.$executeRawUnsafe(sql);

      // Generate a simple checksum
      const checksum = Buffer.from(sql).toString('base64').slice(0, 64);
      const id = crypto.randomUUID();

      // Record successful migration
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count, started_at)
        VALUES ('${id}', '${checksum}', '${new Date().toISOString()}', '${dirName}', 1, '${startedAt}')
      `);

      appliedCount++;
      Logger.log(`Applied migration: ${dirName}`);
    } catch (error: unknown) {
      Logger.error(
        `Failed to apply migration ${dirName}: ${error instanceof Error ? error.message : ''}`,
      );
      throw error;
    }
  }

  if (appliedCount === 0) {
    Logger.log('No pending migrations to apply');
  } else {
    Logger.log(`Applied ${appliedCount} migration(s)`);
  }
}
