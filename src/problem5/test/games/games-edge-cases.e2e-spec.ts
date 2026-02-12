import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { createTestApp } from '../helpers/test-app.helper';
import { truncateAllTables } from '../helpers/db-cleanup.helper';
import { buildCreateGameDto } from '../helpers/game-factory.helper';

describe('Games Edge Cases (e2e)', () => {
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

  it('two games with same name get different slugs', async () => {
    const dto = buildCreateGameDto({ name: 'Duplicate Name' });

    const res1 = await request(app.getHttpServer())
      .post('/games')
      .send(dto)
      .expect(201);
    const res2 = await request(app.getHttpServer())
      .post('/games')
      .send(dto)
      .expect(201);

    const slug1 = (res1.body as { slug: string }).slug;
    const slug2 = (res2.body as { slug: string }).slug;
    expect(slug1).not.toBe(slug2);
    expect(slug1).toContain('duplicate-name');
    expect(slug2).toContain('duplicate-name');
  });

  it('names with special characters produce clean slugs', async () => {
    const dto = buildCreateGameDto({ name: 'Héllo Wörld! @#$%' });

    const res = await request(app.getHttpServer())
      .post('/games')
      .send(dto)
      .expect(201);

    const slug = (res.body as { slug: string }).slug;
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('hello-world');
  });

  it('PATCH non-existent slug returns 200 with null', async () => {
    const res = await request(app.getHttpServer())
      .patch('/games/does-not-exist')
      .send({ name: 'Updated' })
      .expect(200);

    expect(res.body).toBeNull();
  });

  it('DELETE non-existent slug returns 200 with null', async () => {
    const res = await request(app.getHttpServer())
      .delete('/games/does-not-exist')
      .expect(200);

    expect(res.body).toBeNull();
  });

  it('double delete same game returns 200 (idempotent soft delete)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/games')
      .send(buildCreateGameDto());
    const slug = (createRes.body as { slug: string }).slug;

    await request(app.getHttpServer()).delete(`/games/${slug}`).expect(200);
    await request(app.getHttpServer()).delete(`/games/${slug}`).expect(200);
  });

  it('soft-deleted game still accessible via GET /games/:slug', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/games')
      .send(buildCreateGameDto({ name: 'Ghost' }));
    const slug = (createRes.body as { slug: string }).slug;

    await request(app.getHttpServer()).delete(`/games/${slug}`);

    const res = await request(app.getHttpServer())
      .get(`/games/${slug}`)
      .expect(200);

    const body = res.body as Record<string, unknown>;
    expect(body.name).toBe('Ghost');
    expect(body.deletedAt).not.toBeNull();
  });
});
