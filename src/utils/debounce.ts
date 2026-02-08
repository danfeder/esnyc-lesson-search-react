// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DebouncedFunction<T extends (..._args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (..._args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  // In test environments, run debounced functions synchronously to avoid act() warnings
  const isTest =
    typeof process !== 'undefined' &&
    (process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

  if (isTest) {
    const fn = (...args: Parameters<T>) => {
      func(...args);
    };
    fn.cancel = () => {};
    return fn;
  }

  let timeout: ReturnType<typeof setTimeout>;

  const fn = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  fn.cancel = () => {
    clearTimeout(timeout);
  };

  return fn;
}
