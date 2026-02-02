import { Module } from '@nestjs/common';
import { GamePlayerService } from './game-player.service';
import { GamePlayerController } from './game-player.controller';

@Module({
  controllers: [GamePlayerController],
  providers: [GamePlayerService],
})
export class GamePlayerModule {}
