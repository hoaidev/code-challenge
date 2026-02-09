-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SINGLE_PLAYER', 'MULTIPLAYER');

-- CreateEnum
CREATE TYPE "GameGenre" AS ENUM ('ACTION', 'ADVENTURE', 'ROLE_PLAYING', 'STRATEGY');

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "GameType" NOT NULL DEFAULT 'SINGLE_PLAYER',
    "genre" "GameGenre" NOT NULL DEFAULT 'ACTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_plays" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "games_plays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- AddForeignKey
ALTER TABLE "games_plays" ADD CONSTRAINT "games_plays_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_plays" ADD CONSTRAINT "games_plays_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
