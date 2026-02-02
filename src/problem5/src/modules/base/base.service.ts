import { Inject } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

export class BaseService {
  @Inject(PrismaService)
  readonly prisma: PrismaService;
}
