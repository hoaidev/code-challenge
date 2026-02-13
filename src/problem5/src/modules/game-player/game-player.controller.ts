import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { GamePlayerService } from './game-player.service';
import { Validate } from 'nestjs-typebox';
import {
  type CreateGamePlayerDtoType,
  CreateGamePlayerResponseSchema,
  CreateGamePlayerSchema,
  GamePlayerSchema,
  type QueryGamePlayerDtoType,
  QueryGamePlayerSchema,
} from './game-player.schema';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TypeboxValidationPipe } from '@/pipes/typebox-validation.pipe';
import { Type } from '@sinclair/typebox';
import { Cached, InvalidateCache } from '@/decorators/cache.decorators';

const GAME_PLAYER_TTL = parseInt(process.env.CACHE_GAME_PLAYER_TTL ?? '30');

@ApiTags('Game Player Endpoints')
@Controller('game-player')
export class GamePlayerController {
  constructor(private readonly gamePlayerService: GamePlayerService) {}

  @Post()
  @Validate({
    request: [{ type: 'body', schema: CreateGamePlayerSchema }],
    response: { schema: CreateGamePlayerResponseSchema, responseCode: 201 },
  })
  @InvalidateCache('game-player:list:*')
  create(@Body() createGamePlayerDto: CreateGamePlayerDtoType) {
    return this.gamePlayerService.create(createGamePlayerDto);
  }

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Validate({
    response: { schema: Type.Array(GamePlayerSchema), responseCode: 200 },
  })
  @Cached({ prefix: 'game-player:list', ttl: GAME_PLAYER_TTL })
  findAll(
    @Query(new TypeboxValidationPipe(QueryGamePlayerSchema))
    query: QueryGamePlayerDtoType,
  ) {
    return this.gamePlayerService.findGamePlayer(query);
  }
}
