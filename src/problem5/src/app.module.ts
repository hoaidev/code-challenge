import { Module, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { GamesModule } from './modules/games/games.module';
import { GamePlayerModule } from './modules/game-player/game-player.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { OtelLoggerModule } from './telemetry/otel-logger.module';
import { REDIS_CLIENT } from './modules/redis/redis-cache.service';
import { HttpCacheInterceptor } from './interceptors/http-cache.interceptor';

@Module({
  imports: [
    OtelLoggerModule,
    PrismaModule,
    RedisModule,
    GamesModule,
    GamePlayerModule,
    ThrottlerModule.forRootAsync({
      useFactory: (redis: Redis) => ({
        throttlers: [
          {
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '10'),
            ttl: seconds(parseInt(process.env.THROTTLE_TTL ?? '60')),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
      inject: [REDIS_CLIENT],
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {
    if (process.env.APPLY_MIGRATION_STARTUP === 'true') {
      const { applyMigrations } = await import('@/libs/migration');
      await applyMigrations();
    }
  }
}
