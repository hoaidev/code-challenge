import { SetMetadata } from '@nestjs/common';

export interface CachedOptions {
  /** Cache key prefix, e.g. 'games:list' or 'games:detail' */
  prefix: string;
  /** TTL in seconds (default: 60) */
  ttl?: number;
  /** Route param to use as cache key suffix instead of query string.
   *  e.g. paramKey: 'slug' → key becomes `prefix:{req.params.slug}` */
  paramKey?: string;
}

export const CACHE_METADATA = Symbol('CACHE_METADATA');
export const INVALIDATE_CACHE_METADATA = Symbol('INVALIDATE_CACHE_METADATA');

/**
 * Marks a GET handler for automatic response caching.
 *
 * Key is built as:
 * - `prefix:{sortedQueryParams}` (default)
 * - `prefix:{routeParam}` (when paramKey is set)
 */
export const Cached = (options: CachedOptions) =>
  SetMetadata(CACHE_METADATA, options);

/**
 * Marks a mutation handler to invalidate cache patterns after success.
 *
 * Patterns support `:paramName` placeholders resolved from route params.
 * e.g. `'games:detail::slug'` becomes `'games:detail:my-game-slug'`
 */
export const InvalidateCache = (...patterns: string[]) =>
  SetMetadata(INVALIDATE_CACHE_METADATA, patterns);
