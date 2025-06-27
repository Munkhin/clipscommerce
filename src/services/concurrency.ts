export async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < items.length; i++) {
    const p = handler(items[i], i);
    const wrappedPromise = p.finally(() => {
      executing.delete(wrappedPromise);
    });
    executing.add(wrappedPromise);

    if (executing.size >= limit) {
      await Promise.race(Array.from(executing));
    }
  }

  await Promise.all(Array.from(executing));
} 