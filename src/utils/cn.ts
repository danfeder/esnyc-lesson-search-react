/**
 * Tiny class-name joiner. Filters out falsy values so you can write:
 *   cn('base', isActive && 'active', className)
 * without boolean `false` leaking through as a "false" class string.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
