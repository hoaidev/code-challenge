import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { GamesModule } from './modules/games/games.module';
import { execSync } from 'child_process';
import { GamePlayerModule } from './modules/game-player/game-player.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule, GamesModule, GamePlayerModule],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);
  onModuleInit() {
    if (process.env.APPLY_MIGRATION_STARTUP === 'true') {
      try {
        execSync('prisma migrate deploy', {
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        this.logger.log('Prisma migrations applied successfully');
      } catch (error) {
        this.logger.error('Prisma migration failed:', error.message);
        throw error;
      }
    }
  }
}
