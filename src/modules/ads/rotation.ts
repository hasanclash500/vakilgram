export function rotateSelection<T>(
  items: readonly T[],
  offset: number,
  limit: number
): T[] {
  if (items.length === 0 || limit <= 0) return [];

  const safeOffset =
    ((Math.trunc(offset) % items.length) + items.length) % items.length;
  const count = Math.min(limit, items.length);
  const result: T[] = [];

  for (let index = 0; index < count; index += 1) {
    result.push(items[(safeOffset + index) % items.length]!);
  }

  return result;
}
