/**
 * Converts a string to a URL-friendly slug
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Converts a string to a unique slug by appending a short random suffix
 */
export function toUniqueSlug(str: string): string {
  const baseSlug = toSlug(str);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}

/**
 * Converts a string to a unique slug using a timestamp
 */
export function toTimestampSlug(str: string): string {
  const baseSlug = toSlug(str);
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}
