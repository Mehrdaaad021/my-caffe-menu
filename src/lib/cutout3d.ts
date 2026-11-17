import { useEffect, useState } from 'react';

const cutoutCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

async function extractWhiteBackgroundCutout(src: string): Promise<string> {
  if (cutoutCache.has(src)) {
    return cutoutCache.get(src)!;
  }
  if (inFlight.has(src)) {
    return inFlight.get(src)!;
  }

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 540;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Check if corners are actually near-white; if not (e.g., dark user upload), keep original
        const isBrightNeutral = (idx: number, minThresh: number, maxDiff: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 20) return true;
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          return minC >= minThresh && maxC - minC <= maxDiff;
        };

        const corners = [
          0,
          (w - 1) * 4,
          (h - 1) * w * 4,
          ((h - 1) * w + (w - 1)) * 4,
        ];
        const hasWhiteBackdrop = corners.some((c) => isBrightNeutral(c, 242, 18));
        if (!hasWhiteBackdrop) {
          cutoutCache.set(src, src);
          resolve(src);
          return;
        }

        // Edge-connected flood fill so interior white highlights (latte foam, eggs, plate) stay untouched
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const enqueue = (x: number, y: number) => {
          const pos = y * w + x;
          if (visited[pos]) return;
          const idx = pos * 4;
          if (isBrightNeutral(idx, 240, 20)) {
            visited[pos] = 1;
            queue[tail++] = pos;
          }
        };

        for (let x = 0; x < w; x++) {
          enqueue(x, 0);
          enqueue(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          enqueue(0, y);
          enqueue(w - 1, y);
        }

        while (head < tail) {
          const pos = queue[head++];
          const px = pos % w;
          const py = (pos - px) / w;
          data[pos * 4 + 3] = 0;

          if (px > 0) enqueue(px - 1, py);
          if (px < w - 1) enqueue(px + 1, py);
          if (py > 0) enqueue(px, py - 1);
          if (py < h - 1) enqueue(px, py + 1);
        }

        // Soft 1px perimeter anti-alias feather where opaque pixels touch transparent background
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const pos = y * w + x;
            if (visited[pos]) continue;
            const touchesBg =
              visited[pos - 1] || visited[pos + 1] || visited[pos - w] || visited[pos + w];
            if (touchesBg) {
              const idx = pos * 4;
              const minC = Math.min(data[idx], data[idx + 1], data[idx + 2]);
              if (minC > 224) {
                data[idx + 3] = Math.round(data[idx + 3] * 0.45);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const outUrl = canvas.toDataURL('image/png');
        cutoutCache.set(src, outUrl);
        resolve(outUrl);
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  inFlight.set(src, task);
  const result = await task;
  inFlight.delete(src);
  return result;
}

export function useTransparent3DCutout(src: string): {
  cutoutSrc: string;
  isCutout: boolean;
} {
  const [cutoutSrc, setCutoutSrc] = useState<string>(() => cutoutCache.get(src) || src);

  useEffect(() => {
    let active = true;
    const cached = cutoutCache.get(src);
    if (cached) {
      setCutoutSrc(cached);
      return;
    }
    extractWhiteBackgroundCutout(src).then((res) => {
      if (active) setCutoutSrc(res);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return {
    cutoutSrc,
    isCutout: cutoutSrc !== src || cutoutCache.get(src) !== undefined,
  };
}
