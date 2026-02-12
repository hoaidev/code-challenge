import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { configureNestJsTypebox } from 'nestjs-typebox';
import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/filters/http-exception.filter';
import { NullResponseInterceptor } from '@/interceptors/null-response.interceptor';
import { PrismaService } from '@/modules/prisma/prisma.service';

configureNestJsTypebox({ patchSwagger: false, setFormats: true });

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new NullResponseInterceptor());
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}
