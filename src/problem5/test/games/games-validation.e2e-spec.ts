import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Redis } from 'ioredis';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { truncateAllTables } from '../helpers/db-cleanup.helper';
import { buildCreateGameDto } from '../helpers/game-factory.helper';

describe('Games Validation (e2e)', () => {
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

  describe('POST /games validation', () => {
    it('rejects empty body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/games')
        .send({})
        .expect(400);

      expect((res.body as { statusCode: number }).statusCode).toBe(400);
    });

    it('rejects missing name with 400', async () => {
      const dto = buildCreateGameDto();
      delete (dto as Record<string, unknown>).name;

      await request(app.getHttpServer()).post('/games').send(dto).expect(400);
    });

    it('rejects invalid price type with 400', async () => {
      const dto = buildCreateGameDto({ price: 'not-a-number' });

      await request(app.getHttpServer()).post('/games').send(dto).expect(400);
    });

    it('rejects invalid status enum with 400', async () => {
      const dto = buildCreateGameDto({ status: 'INVALID_STATUS' });

      await request(app.getHttpServer()).post('/games').send(dto).expect(400);
    });

    it('rejects invalid type enum with 400', async () => {
      const dto = buildCreateGameDto({ type: 'INVALID_TYPE' });

      await request(app.getHttpServer()).post('/games').send(dto).expect(400);
    });

    it('rejects invalid genre enum with 400', async () => {
      const dto = buildCreateGameDto({ genre: 'INVALID_GENRE' });

      await request(app.getHttpServer()).post('/games').send(dto).expect(400);
    });
  });

  describe('PATCH /games/:slug validation', () => {
    it('accepts empty body (partial schema allows it)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto());
      const slug = (createRes.body as { slug: string }).slug;

      await request(app.getHttpServer())
        .patch(`/games/${slug}`)
        .send({})
        .expect(200);
    });
  });

  describe('GET /games query validation', () => {
    it('rejects invalid status query param with 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ status: 'BOGUS' })
        .expect(400);

      expect((res.body as { statusCode: number }).statusCode).toBe(400);
    });
  });
});
