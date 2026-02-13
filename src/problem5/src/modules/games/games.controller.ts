import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { Type } from '@sinclair/typebox';
import { Validate } from 'nestjs-typebox';
import {
  type CreateGameDtoType,
  type UpdateGameDtoType,
  CreateGameSchema,
  GameSchema,
  type QueryGameDtoType,
  QueryGameSchema,
  UpdateGameSchema,
} from './games.schema';
import { TypeboxValidationPipe } from '@/pipes/typebox-validation.pipe';
import { GameGenre, GameStatus, GameType } from '@/generated/enums';
import { Cached, InvalidateCache } from '@/decorators/cache.decorators';

const GAMES_TTL = parseInt(process.env.CACHE_GAMES_TTL ?? '60');

@ApiTags('Game Endpoints')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @Validate({
    request: [{ type: 'body', schema: CreateGameSchema }],
    response: {
      schema: CreateGameSchema,
      responseCode: 201,
      stripUnknownProps: false,
    },
  })
  @InvalidateCache('games:list:*')
  create(@Body() body: CreateGameDtoType) {
    return this.gamesService.create(body);
  }

  @Get()
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GameStatus })
  @ApiQuery({ name: 'type', required: false, enum: GameType })
  @ApiQuery({ name: 'genre', required: false, enum: GameGenre })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Validate({
    response: { schema: Type.Array(GameSchema), responseCode: 200 },
  })
  @Cached({ prefix: 'games:list', ttl: GAMES_TTL })
  findAll(
    @Query(new TypeboxValidationPipe(QueryGameSchema)) query: QueryGameDtoType,
  ) {
    return this.gamesService.findAll(query);
  }

  @Get(':slug')
  @Cached({ prefix: 'games:detail', ttl: GAMES_TTL, paramKey: 'slug' })
  findOne(@Param('slug') slug: string) {
    return this.gamesService.findOne(slug);
  }

  @Patch(':slug')
  @Validate({
    request: [
      { name: 'slug', type: 'param', schema: Type.String() },
      { type: 'body', schema: UpdateGameSchema },
    ],
    response: {
      schema: Type.Union([GameSchema, Type.Null()]),
      responseCode: 200,
      stripUnknownProps: true,
    },
  })
  @InvalidateCache('games:detail::slug', 'games:list:*')
  update(
    @Param('slug') slug: string,
    @Body() updateGameDto: UpdateGameDtoType,
  ) {
    return this.gamesService.update(slug, updateGameDto);
  }

  @Delete(':slug')
  @InvalidateCache('games:detail::slug', 'games:list:*')
  remove(@Param('slug') slug: string) {
    return this.gamesService.remove(slug);
  }
}
