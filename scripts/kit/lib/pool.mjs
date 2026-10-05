// site-kit v0.1.0
/** Run `fn` over `items` with bounded concurrency, preserving order. */
export async function pool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
      while (i < items.length) {
        const my = i++;
        out[my] = await fn(items[my], my);
      }
    }),
  );
  return out;
}
