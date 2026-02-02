import { GameGenre, GameStatus, GameType } from '@/generated/enums';
import { Static, Type } from '@sinclair/typebox';

const SchemaBase = Type.Object({
  slug: Type.String(),
  createdAt: Type.Date(),
  updatedAt: Type.Union([Type.Date(), Type.Null()]),
  deletedAt: Type.Union([Type.Date(), Type.Null()]),
});

export const CreateGameSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  price: Type.Number(),
  status: Type.Enum(GameStatus),
  type: Type.Enum(GameType),
  genre: Type.Enum(GameGenre),
});

export const QueryGameSchema = Type.Object({
  name: Type.Optional(Type.String()),
  status: Type.Optional(Type.Enum(GameStatus)),
  type: Type.Optional(Type.Enum(GameType)),
  genre: Type.Optional(Type.Enum(GameGenre)),
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

export const GameSchema = Type.Composite([CreateGameSchema, SchemaBase]);

export type CreateGameDtoType = Static<typeof CreateGameSchema>;
export type QueryGameDtoType = Static<typeof QueryGameSchema>;
export type GameDtoType = Static<typeof GameSchema>;

// Update schema (all fields optional)
export const UpdateGameSchema = Type.Partial(CreateGameSchema);
export type UpdateGameDtoType = Static<typeof UpdateGameSchema>;
