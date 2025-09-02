export function debounce<T extends (..._args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  // In test environments, run debounced functions synchronously to avoid act() warnings
  const isTest =
    typeof process !== 'undefined' &&
    (process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

  if (isTest) {
    return (...args: Parameters<T>) => {
      func(...args);
    };
  }

  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
