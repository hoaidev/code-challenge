import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class NullResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data === null || data === undefined) {
          const res = context.switchToHttp().getResponse<Response>();
          res.setHeader('Content-Type', 'application/json');
          res.end('null');
          return;
        }
        return data;
      }),
    );
  }
}
