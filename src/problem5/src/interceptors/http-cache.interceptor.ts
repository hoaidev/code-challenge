import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { RedisCacheService } from '@/modules/redis/redis-cache.service';
import {
  CACHE_METADATA,
  INVALIDATE_CACHE_METADATA,
  type CachedOptions,
} from '@/decorators/cache.decorators';

const DEFAULT_TTL = 60;

function buildCacheKey(options: CachedOptions, req: Request): string {
  if (options.paramKey) {
    return `${options.prefix}:${String(req.params[options.paramKey])}`;
  }
  const params = Object.entries(req.query as Record<string, string>)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${options.prefix}:${params}`;
}

function resolvePatterns(
  patterns: string[],
  params: Record<string, string>,
): string[] {
  return patterns.map((pattern) =>
    pattern.replace(/:(\w+)/g, (_, name: string) => params[name] ?? ''),
  );
}

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const cachedOptions = this.reflector.get<CachedOptions | undefined>(
      CACHE_METADATA,
      context.getHandler(),
    );

    if (cachedOptions) {
      return this.handleCachedRead(cachedOptions, context, next);
    }

    const invalidatePatterns = this.reflector.get<string[] | undefined>(
      INVALIDATE_CACHE_METADATA,
      context.getHandler(),
    );

    if (invalidatePatterns) {
      return this.handleInvalidation(invalidatePatterns, context, next);
    }

    return next.handle();
  }

  private handleCachedRead(
    options: CachedOptions,
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = buildCacheKey(options, req);
    const ttl = options.ttl ?? DEFAULT_TTL;

    return new Observable((subscriber) => {
      this.cache
        .get(key)
        .then((cached) => {
          if (cached !== null) {
            subscriber.next(cached);
            subscriber.complete();
            return;
          }
          next
            .handle()
            .pipe(
              tap((data) => {
                if (data !== null && data !== undefined) {
                  void this.cache.set(key, data, ttl);
                }
              }),
            )
            .subscribe(subscriber);
        })
        .catch((err) => subscriber.error(err));
    });
  }

  private handleInvalidation(
    patterns: string[],
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const resolved = resolvePatterns(
      patterns,
      req.params as Record<string, string>,
    );

    return next.handle().pipe(
      tap(() => {
        void Promise.all(
          resolved.map((p) =>
            p.includes('*') ? this.cache.delByPattern(p) : this.cache.del(p),
          ),
        );
      }),
    );
  }
}
