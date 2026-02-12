import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { truncateAllTables } from '../helpers/db-cleanup.helper';
import { buildCreateGameDto } from '../helpers/game-factory.helper';

describe('Games CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  describe('POST /games', () => {
    it('creates a game and returns 201 with slug', async () => {
      const dto = buildCreateGameDto();
      const res = await request(app.getHttpServer())
        .post('/games')
        .send(dto)
        .expect(201);

      expect(res.body).toMatchObject({
        name: dto.name,
        description: dto.description,
        price: dto.price,
        status: dto.status,
        type: dto.type,
        genre: dto.genre,
      });
      expect((res.body as { slug: string }).slug).toBeDefined();
      expect(typeof (res.body as { slug: string }).slug).toBe('string');
    });

    it('works with all enum combinations', async () => {
      const combos = [
        { status: 'DRAFT', type: 'MULTIPLAYER', genre: 'ADVENTURE' },
        { status: 'ARCHIVED', type: 'SINGLE_PLAYER', genre: 'ROLE_PLAYING' },
        { status: 'PUBLISHED', type: 'MULTIPLAYER', genre: 'STRATEGY' },
      ];

      for (const combo of combos) {
        const dto = buildCreateGameDto({
          name: `Game ${combo.status}`,
          ...combo,
        });
        const res = await request(app.getHttpServer())
          .post('/games')
          .send(dto)
          .expect(201);

        const body = res.body as Record<string, unknown>;
        expect(body.status).toBe(combo.status);
        expect(body.type).toBe(combo.type);
        expect(body.genre).toBe(combo.genre);
      }
    });
  });

  describe('GET /games', () => {
    it('returns empty array when no games', async () => {
      const res = await request(app.getHttpServer()).get('/games').expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns all non-deleted games', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Game A' }));
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Game B' }));

      const res = await request(app.getHttpServer()).get('/games').expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('filters by partial name match', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Alpha Strike' }));
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Beta Force' }));

      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ name: 'Alpha' })
        .expect(200);

      const games = res.body as Record<string, unknown>[];
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Alpha Strike');
    });

    it('filters by status', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Pub', status: 'PUBLISHED' }));
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Draft', status: 'DRAFT' }));

      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ status: 'DRAFT' })
        .expect(200);

      const games = res.body as Record<string, unknown>[];
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Draft');
    });

    it('filters by type', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Solo', type: 'SINGLE_PLAYER' }));
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Multi', type: 'MULTIPLAYER' }));

      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ type: 'MULTIPLAYER' })
        .expect(200);

      const games = res.body as Record<string, unknown>[];
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Multi');
    });

    it('filters by genre', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Strat', genre: 'STRATEGY' }));
      await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Act', genre: 'ACTION' }));

      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ genre: 'STRATEGY' })
        .expect(200);

      const games = res.body as Record<string, unknown>[];
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Strat');
    });

    it('supports combining multiple filters', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(
          buildCreateGameDto({
            name: 'Target',
            status: 'PUBLISHED',
            genre: 'STRATEGY',
          }),
        );
      await request(app.getHttpServer())
        .post('/games')
        .send(
          buildCreateGameDto({
            name: 'Other',
            status: 'PUBLISHED',
            genre: 'ACTION',
          }),
        );
      await request(app.getHttpServer())
        .post('/games')
        .send(
          buildCreateGameDto({
            name: 'Draft',
            status: 'DRAFT',
            genre: 'STRATEGY',
          }),
        );

      const res = await request(app.getHttpServer())
        .get('/games')
        .query({ status: 'PUBLISHED', genre: 'STRATEGY' })
        .expect(200);

      const games = res.body as Record<string, unknown>[];
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Target');
    });

    it('soft-deleted games are excluded from list', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Doomed' }));
      const slug = (createRes.body as { slug: string }).slug;

      await request(app.getHttpServer()).delete(`/games/${slug}`);

      const res = await request(app.getHttpServer()).get('/games').expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /games/:slug', () => {
    it('returns a single game by slug', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Find Me' }));
      const slug = (createRes.body as { slug: string }).slug;

      const res = await request(app.getHttpServer())
        .get(`/games/${slug}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.name).toBe('Find Me');
      expect(body.slug).toBe(slug);
    });

    it('returns null for non-existent slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/games/does-not-exist')
        .expect(200);

      expect(res.body).toBeNull();
    });
  });

  describe('PATCH /games/:slug', () => {
    it('updates fields partially', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'Original' }));
      const slug = (createRes.body as { slug: string }).slug;

      const res = await request(app.getHttpServer())
        .patch(`/games/${slug}`)
        .send({ name: 'Updated', price: 49.99 })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.name).toBe('Updated');
      expect(body.price).toBe(49.99);
      expect(body.slug).toBe(slug);
    });
  });

  describe('DELETE /games/:slug', () => {
    it('soft-deletes a game (sets deletedAt)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/games')
        .send(buildCreateGameDto({ name: 'To Delete' }));
      const slug = (createRes.body as { slug: string }).slug;

      const res = await request(app.getHttpServer())
        .delete(`/games/${slug}`)
        .expect(200);

      expect((res.body as { deletedAt: unknown }).deletedAt).not.toBeNull();

      // Verify in DB
      const dbGame = await prisma.game.findUnique({ where: { slug } });
      expect(dbGame!.deletedAt).not.toBeNull();
    });
  });
});
