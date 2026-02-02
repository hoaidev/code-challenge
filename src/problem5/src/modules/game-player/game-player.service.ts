import { Injectable } from '@nestjs/common';
import { BaseService } from '../base/base.service';
import {
  CreateGamePlayerDtoType,
  GamePlayerDtoType,
  QueryGamePlayerDtoType,
} from './game-player.schema';
import { Prisma } from '@/generated/client';

@Injectable()
export class GamePlayerService extends BaseService {
  async create(createGamePlayerDto: CreateGamePlayerDtoType) {
    const game = await this.prisma.game.findUnique({
      where: { slug: createGamePlayerDto.gameSlug },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!game || game.status !== 'PUBLISHED' || game.deletedAt) {
      throw new Error('Game not found');
    }

    const player = await this.prisma.player.upsert({
      where: { email: createGamePlayerDto.playerEmail },
      create: {
        email: createGamePlayerDto.playerEmail,
        name: createGamePlayerDto.playerName,
      },
      update: { deletedAt: null },
      select: { id: true },
    });

    return this.prisma.gamePlay.create({
      data: {
        gameId: game.id,
        playerId: player.id,
        score: createGamePlayerDto.score,
      },
    });
  }

  async findGamePlayer(
    query: QueryGamePlayerDtoType,
  ): Promise<GamePlayerDtoType[]> {
    const where: Prisma.GamePlayWhereInput = {
      deletedAt: null,
      ...(query.limit && { take: query.limit }),
      ...(query.offset && { skip: query.offset }),
    };
    const result = await this.prisma.gamePlay.findMany({
      where,
      select: {
        score: true,
        createdAt: true,
        game: { select: { name: true, genre: true, status: true, type: true } },
        player: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return result.map((item) => ({
      player: { email: item.player.email, name: item.player.name },
      game: { ...item.game },
      score: item.score,
      createdAt: item.createdAt,
    }));
  }
}
