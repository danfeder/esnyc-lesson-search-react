// eslint-disable-next-line no-unused-vars
export function debounce<T extends (..._args: any[]) => any>(
  func: T,
  wait: number
  // eslint-disable-next-line no-unused-vars
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
