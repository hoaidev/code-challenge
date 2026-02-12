import { PrismaService } from '@/modules/prisma/prisma.service';

export async function truncateAllTables(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "games_plays", "players", "games" RESTART IDENTITY CASCADE`,
  );
}
