import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Redis } from 'ioredis';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { truncateAllTables } from '../helpers/db-cleanup.helper';
import {
  buildCreateGameDto,
  buildCreateGamePlayerDto,
} from '../helpers/game-factory.helper';

describe('Game-Player Business Rules & Validation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await redis.flushdb();
    await truncateAllTables(prisma);
  });

  async function createGame(overrides: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/games')
      .send(buildCreateGameDto(overrides));
    return (res.body as { slug: string }).slug;
  }

  describe('Business rules (game status checks)', () => {
    it('non-existent gameSlug returns 404', async () => {
      const dto = buildCreateGamePlayerDto('non-existent-slug');

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(404);
    });

    it('DRAFT game returns 404', async () => {
      const slug = await createGame({ status: 'DRAFT' });
      const dto = buildCreateGamePlayerDto(slug);

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(404);
    });

    it('ARCHIVED game returns 404', async () => {
      const slug = await createGame({ status: 'ARCHIVED' });
      const dto = buildCreateGamePlayerDto(slug);

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(404);
    });

    it('soft-deleted PUBLISHED game returns 404', async () => {
      const slug = await createGame({ status: 'PUBLISHED' });

      // Soft-delete the game
      await request(app.getHttpServer()).delete(`/games/${slug}`);

      const dto = buildCreateGamePlayerDto(slug);

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(404);
    });
  });

  describe('Validation', () => {
    it('empty body returns 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/game-player')
        .send({})
        .expect(400);

      expect((res.body as { statusCode: number }).statusCode).toBe(400);
    });

    it('invalid email format returns 400', async () => {
      const slug = await createGame({ status: 'PUBLISHED' });
      const dto = buildCreateGamePlayerDto(slug, {
        playerEmail: 'not-an-email',
      });

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(400);
    });

    it('invalid score type returns 400', async () => {
      const slug = await createGame({ status: 'PUBLISHED' });
      const dto = buildCreateGamePlayerDto(slug, { score: 'not-a-number' });

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(400);
    });

    it('missing gameSlug returns 400', async () => {
      const dto = {
        playerEmail: 'player@test.com',
        playerName: 'Test',
        score: 100,
      };

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(400);
    });
  });
});
