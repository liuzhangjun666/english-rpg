const _cache = new Map<string, Promise<void>>();

/** 预加载单张图片（带缓存，可重复调用） */
export function preloadImage(url: string): Promise<void> {
  const src = String(url || '').trim();
  if (!src) return Promise.resolve();

  let pending = _cache.get(src);
  if (!pending) {
    pending = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn('[imagePreloader] 图片加载失败', src);
        resolve();
      };
      img.src = src;
    });
    _cache.set(src, pending);
  }
  return pending;
}

/** 批量预加载；onProgress(done, total) 在每张图完成时回调 */
export async function preloadImages(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const unique = [...new Set(urls.map((u) => String(u || '').trim()).filter(Boolean))];
  const total = unique.length;
  if (total === 0) {
    onProgress?.(0, 0);
    return;
  }

  let done = 0;
  await Promise.all(
    unique.map(async (url) => {
      await preloadImage(url);
      done += 1;
      onProgress?.(done, total);
    }),
  );
}

export function _resetImageCacheForTest() {
  _cache.clear();
}
