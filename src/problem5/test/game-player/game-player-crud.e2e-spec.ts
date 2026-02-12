import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { truncateAllTables } from '../helpers/db-cleanup.helper';
import {
  buildCreateGameDto,
  buildCreateGamePlayerDto,
} from '../helpers/game-factory.helper';

describe('Game-Player CRUD (e2e)', () => {
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

  async function createPublishedGame(name = 'Test Game') {
    const res = await request(app.getHttpServer())
      .post('/games')
      .send(buildCreateGameDto({ name, status: 'PUBLISHED' }));
    return (res.body as { slug: string }).slug;
  }

  describe('POST /game-player', () => {
    it('creates a gameplay record for a PUBLISHED game with 201', async () => {
      const slug = await createPublishedGame();
      const dto = buildCreateGamePlayerDto(slug);

      const res = await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(201);

      expect((res.body as { score: number }).score).toBe(dto.score);
    });

    it('player is upserted by email (no duplicates)', async () => {
      const slug = await createPublishedGame();

      await request(app.getHttpServer())
        .post('/game-player')
        .send(
          buildCreateGamePlayerDto(slug, {
            playerEmail: 'same@test.com',
            score: 50,
          }),
        )
        .expect(201);
      await request(app.getHttpServer())
        .post('/game-player')
        .send(
          buildCreateGamePlayerDto(slug, {
            playerEmail: 'same@test.com',
            score: 80,
          }),
        )
        .expect(201);

      const players = await prisma.player.findMany({
        where: { email: 'same@test.com' },
      });
      expect(players).toHaveLength(1);
    });

    it('multiple gameplay records for same player+game are allowed', async () => {
      const slug = await createPublishedGame();
      const dto = buildCreateGamePlayerDto(slug);

      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(201);
      await request(app.getHttpServer())
        .post('/game-player')
        .send(dto)
        .expect(201);

      const plays = await prisma.gamePlay.findMany();
      expect(plays).toHaveLength(2);
    });

    it('soft-deleted player is un-deleted on upsert', async () => {
      const slug = await createPublishedGame();
      const email = 'revive@test.com';

      await request(app.getHttpServer())
        .post('/game-player')
        .send(buildCreateGamePlayerDto(slug, { playerEmail: email }))
        .expect(201);

      // Soft-delete the player directly
      await prisma.player.update({
        where: { email },
        data: { deletedAt: new Date() },
      });

      // Play again — upsert should clear deletedAt
      await request(app.getHttpServer())
        .post('/game-player')
        .send(buildCreateGamePlayerDto(slug, { playerEmail: email }))
        .expect(201);

      const player = await prisma.player.findUnique({ where: { email } });
      expect(player!.deletedAt).toBeNull();
    });
  });

  describe('GET /game-player', () => {
    it('returns empty array initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/game-player')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns records with nested player and game data', async () => {
      const slug = await createPublishedGame('Chess Master');

      await request(app.getHttpServer())
        .post('/game-player')
        .send(
          buildCreateGamePlayerDto(slug, {
            playerEmail: 'nested@test.com',
            playerName: 'Nested Player',
            score: 200,
          }),
        )
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/game-player')
        .expect(200);

      const records = res.body as Record<string, unknown>[];
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        score: 200,
        player: { email: 'nested@test.com', name: 'Nested Player' },
        game: { name: 'Chess Master' },
      });
      expect(records[0].createdAt).toBeDefined();
    });

    it('excludes soft-deleted gameplay records', async () => {
      const slug = await createPublishedGame();

      await request(app.getHttpServer())
        .post('/game-player')
        .send(buildCreateGamePlayerDto(slug))
        .expect(201);

      // Soft-delete the gameplay record
      const play = await prisma.gamePlay.findFirst();
      await prisma.gamePlay.update({
        where: { id: play!.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .get('/game-player')
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });
});
