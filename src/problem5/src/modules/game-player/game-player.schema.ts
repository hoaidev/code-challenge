import { GameGenre, GameStatus, GameType } from '@/generated/enums';
import { Static, Type } from '@sinclair/typebox';

export const CreateGamePlayerSchema = Type.Object({
  gameSlug: Type.String(),
  playerEmail: Type.String({ format: 'email' }),
  playerName: Type.String(),
  score: Type.Number(),
});

export const CreateGamePlayerResponseSchema = Type.Object({
  score: Type.Number(),
});

export const QueryGamePlayerSchema = Type.Object({
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

const PlayerSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String(),
});

const GameSchema = Type.Object({
  name: Type.String(),
  status: Type.Enum(GameStatus),
  type: Type.Enum(GameType),
  genre: Type.Enum(GameGenre),
});

export const GamePlayerSchema = Type.Composite([
  CreateGamePlayerResponseSchema,
  Type.Object({
    player: PlayerSchema,
    game: GameSchema,
    createdAt: Type.Date(),
  }),
]);

export type GamePlayerDtoType = Static<typeof GamePlayerSchema>;

export type CreateGamePlayerDtoType = Static<typeof CreateGamePlayerSchema>;
export type CreateGamePlayerResponseType = Static<
  typeof CreateGamePlayerResponseSchema
>;
export type QueryGamePlayerDtoType = Static<typeof QueryGamePlayerSchema>;
