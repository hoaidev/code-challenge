import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Request, Response } from 'express';
import { isOtelEnabled } from '@/telemetry/telemetry';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('nestjs-http');

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (!isOtelEnabled) {
      return next.handle();
    }

    const ctx = executionContext.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const route = request.route as { path?: string } | undefined;
    const spanName = `${request.method} ${route?.path || request.path}`;

    return new Observable((subscriber) => {
      this.tracer.startActiveSpan(
        spanName,
        {
          kind: SpanKind.SERVER,
          attributes: {
            'http.method': request.method,
            'http.url': request.url,
            'http.target': request.path,
            'http.user_agent': request.get('user-agent') || '',
          },
        },
        (span) => {
          const startTime = Date.now();

          next
            .handle()
            .pipe(
              tap(() => {
                span.setAttribute('http.status_code', response.statusCode);
                span.setAttribute(
                  'http.response_time_ms',
                  Date.now() - startTime,
                );
                span.setStatus({
                  code:
                    response.statusCode >= 400
                      ? SpanStatusCode.ERROR
                      : SpanStatusCode.OK,
                });
                span.end();
              }),
              catchError((error: Error) => {
                span.recordException(error);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error.message ?? 'Unknown error',
                });
                span.end();
                throw error;
              }),
            )
            .subscribe(subscriber);
        },
      );
    });
  }
}
