import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { isOtelEnabled } from '@/telemetry/telemetry';

const tracer = trace.getTracer('prisma');

function withTracing(client: PrismaClient): PrismaClient {
  if (!isOtelEnabled) return client;

  return client.$extends({
    name: 'otel-tracing',
    query: {
      async $allOperations({ operation, model, args, query }) {
        const spanName = `prisma:${model}.${operation}`;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return tracer.startActiveSpan(spanName, async (span) => {
          span.setAttribute('db.system', 'postgresql');
          span.setAttribute('db.operation', operation);
          if (model) span.setAttribute('db.prisma.model', model);

          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = await query(args);
            span.setStatus({ code: SpanStatusCode.OK });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return result;
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (error as Error).message,
            });
            throw error;
          } finally {
            span.end();
          }
        });
      },
    },
  }) as unknown as PrismaClient;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });

    return withTracing(this) as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
