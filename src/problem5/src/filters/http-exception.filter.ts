import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private extractErrorBody(
    exceptionResponse: string | object,
  ): Record<string, unknown> {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    const body = exceptionResponse as Record<string, unknown>;
    const result: Record<string, unknown> = { message: body.message };

    // Normalize validation errors from both sources into { path, message }:
    // - TypeboxValidationPipe (query): already { path, message }
    // - nestjs-typebox @Validate (body): raw ValueError objects with extra fields
    if (Array.isArray(body.errors)) {
      result.errors = body.errors.map(
        (e: { path?: string; message?: string }) => ({
          path: e.path,
          message: e.message,
        }),
      );
    }

    return result;
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const timestamp = new Date().toISOString();

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}: ${exception.message}`,
        exception.stack,
      );

      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
        timestamp,
      });
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status}: ${exception.message}`,
      );

      const body = this.extractErrorBody(exceptionResponse);

      response.status(status).json({
        statusCode: status,
        ...body,
        timestamp,
      });
    }
  }
}
