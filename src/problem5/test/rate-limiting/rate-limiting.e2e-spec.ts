import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import request from 'supertest';
import { App } from 'supertest/types';
import { Redis } from 'ioredis';
import { configureNestJsTypebox } from 'nestjs-typebox';
import { AppModule } from '@/app.module';
import { GamesModule } from '@/modules/games/games.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { HttpExceptionFilter } from '@/filters/http-exception.filter';

configureNestJsTypebox({ patchSwagger: false, setFormats: true });

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:9379';

describe('Rate Limiting (e2e)', () => {
  const THROTTLE_LIMIT = 3;
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(REDIS_URL);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  describe('Without ThrottlerGuard', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('15 rapid requests all return 200 (no guard)', async () => {
      const requests = Array.from({ length: 15 }, () =>
        request(app.getHttpServer()).get('/games'),
      );

      const responses = await Promise.all(requests);
      const allOk = responses.every((r) => r.status === 200);
      expect(allOk).toBe(true);
    });
  });

  describe('With ThrottlerGuard', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [
          RedisModule,
          GamesModule,
          ThrottlerModule.forRoot({
            throttlers: [{ limit: THROTTLE_LIMIT, ttl: seconds(60) }],
            storage: new ThrottlerStorageRedisService(new Redis(REDIS_URL)),
          }),
        ],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('requests within limit succeed (200)', async () => {
      for (let i = 0; i < THROTTLE_LIMIT; i++) {
        await request(app.getHttpServer()).get('/games').expect(200);
      }
    });

    it('request exceeding limit returns 429', async () => {
      for (let i = 0; i < THROTTLE_LIMIT; i++) {
        await request(app.getHttpServer()).get('/games');
      }

      await request(app.getHttpServer()).get('/games').expect(429);
    });

    it('429 response has proper error shape', async () => {
      for (let i = 0; i < THROTTLE_LIMIT; i++) {
        await request(app.getHttpServer()).get('/games');
      }

      const res = await request(app.getHttpServer()).get('/games').expect(429);

      expect(res.body).toMatchObject({
        statusCode: 429,
        message: expect.stringContaining('ThrottlerException') as string,
      });
    });

    it('rate limit resets after TTL window', async () => {
      const shortApp = await createShortTtlApp();

      try {
        for (let i = 0; i < THROTTLE_LIMIT; i++) {
          await request(shortApp.getHttpServer()).get('/games');
        }
        await request(shortApp.getHttpServer()).get('/games').expect(429);

        // Wait for TTL to expire
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await request(shortApp.getHttpServer()).get('/games').expect(200);
      } finally {
        await shortApp.close();
      }
    }, 10000);
  });
});

async function createShortTtlApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [
      RedisModule,
      GamesModule,
      ThrottlerModule.forRoot({
        throttlers: [{ limit: 3, ttl: seconds(1) }],
        storage: new ThrottlerStorageRedisService(new Redis(REDIS_URL)),
      }),
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}
