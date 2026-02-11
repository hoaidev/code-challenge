import './telemetry/telemetry';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { configureNestJsTypebox, patchNestJsSwagger } from 'nestjs-typebox';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { OtelLoggerService } from './telemetry/otel-logger.service';

dotenv.config();

configureNestJsTypebox({ patchSwagger: true, setFormats: true });

async function bootstrap() {
  patchNestJsSwagger();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(OtelLoggerService);
  app.useLogger(logger);

  // Standard Swagger setup
  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Code challenge API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TracingInterceptor());

  await app.listen(process.env.PORT ?? 5000);

  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger is running on: ${await app.getUrl()}/api`);
}

void bootstrap();
