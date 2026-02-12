import { Injectable } from '@nestjs/common';
import type {
  CreateGameDtoType,
  GameDtoType,
  QueryGameDtoType,
  UpdateGameDtoType,
} from './games.schema';
import { Prisma } from '@/generated/client';
import { toUniqueSlug } from '@/utils/slug';
import { BaseService } from '../base/base.service';

@Injectable()
export class GamesService extends BaseService {
  async create(createGameDto: CreateGameDtoType): Promise<CreateGameDtoType> {
    const data = await this.prisma.game.create({
      data: { ...createGameDto, slug: toUniqueSlug(createGameDto.name) },
    });
    return data;
  }

  async findAll(query: QueryGameDtoType): Promise<GameDtoType[]> {
    const where: Prisma.GameWhereInput = {
      deletedAt: null,
      ...(query.name && { name: { contains: query.name } }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.genre && { genre: query.genre }),
    };
    return await this.prisma.game.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(query.limit && { take: query.limit }),
      ...(query.offset && { skip: query.offset }),
    });
  }

  async findOne(slug: string): Promise<GameDtoType | null> {
    return await this.prisma.game.findUnique({ where: { slug } });
  }

  async update(
    slug: string,
    updateGameDto: UpdateGameDtoType,
  ): Promise<GameDtoType | null> {
    const existing = await this.prisma.game.findUnique({ where: { slug } });
    if (!existing) return null;
    return await this.prisma.game.update({
      where: { slug },
      data: updateGameDto,
    });
  }

  async remove(slug: string): Promise<GameDtoType | null> {
    const existing = await this.prisma.game.findUnique({ where: { slug } });
    if (!existing) return null;
    return await this.prisma.game.update({
      where: { slug },
      data: { deletedAt: new Date() },
    });
  }
}
