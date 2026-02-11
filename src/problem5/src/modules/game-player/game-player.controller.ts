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

@ApiTags('Game Player Endpoints')
@Controller('game-player')
export class GamePlayerController {
  constructor(private readonly gamePlayerService: GamePlayerService) {}

  @Post()
  @Validate({
    request: [{ type: 'body', schema: CreateGamePlayerSchema }],
    response: { schema: CreateGamePlayerResponseSchema, responseCode: 201 },
  })
  create(@Body() createGamePlayerDto: CreateGamePlayerDtoType) {
    return this.gamePlayerService.create(createGamePlayerDto);
  }

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Validate({
    response: { schema: Type.Array(GamePlayerSchema), responseCode: 200 },
  })
  findAll(
    @Query(new TypeboxValidationPipe(QueryGamePlayerSchema))
    query: QueryGamePlayerDtoType,
  ) {
    return this.gamePlayerService.findGamePlayer(query);
  }
}
