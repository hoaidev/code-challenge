import { Injectable, LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';
import { isOtelEnabled } from './telemetry';

@Injectable()
export class OtelLoggerService implements LoggerService {
  private readonly otelLogger = isOtelEnabled ? logs.getLogger('nestjs') : null;

  log(message: string, ...optionalParams: unknown[]) {
    const ctx = this.extractContext(optionalParams);
    console.log(this.format('LOG', ctx, message));
    this.emit(SeverityNumber.INFO, message, ctx);
  }

  error(message: string, ...optionalParams: unknown[]) {
    const ctx = this.extractContext(optionalParams);
    console.error(this.format('ERROR', ctx, message));
    this.emit(SeverityNumber.ERROR, message, ctx);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    const ctx = this.extractContext(optionalParams);
    console.warn(this.format('WARN', ctx, message));
    this.emit(SeverityNumber.WARN, message, ctx);
  }

  debug?(message: string, ...optionalParams: unknown[]) {
    const ctx = this.extractContext(optionalParams);
    console.debug(this.format('DEBUG', ctx, message));
    this.emit(SeverityNumber.DEBUG, message, ctx);
  }

  verbose?(message: string, ...optionalParams: unknown[]) {
    const ctx = this.extractContext(optionalParams);
    console.log(this.format('VERBOSE', ctx, message));
    this.emit(SeverityNumber.TRACE, message, ctx);
  }

  private extractContext(params: unknown[]): string | undefined {
    // NestJS passes context as last string param
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      return params[params.length - 1] as string;
    }
    return undefined;
  }

  private format(level: string, ctx: string | undefined, message: string) {
    const timestamp = new Date().toISOString();
    const prefix = ctx ? `[${ctx}]` : '';
    return `${timestamp} ${level} ${prefix} ${message}`;
  }

  private emit(severity: SeverityNumber, message: string, ctx?: string) {
    if (!this.otelLogger) return;

    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    this.otelLogger.emit({
      severityNumber: severity,
      body: message,
      attributes: {
        ...(ctx && { 'log.context': ctx }),
        ...(spanContext && {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
        }),
      },
    });
  }
}
