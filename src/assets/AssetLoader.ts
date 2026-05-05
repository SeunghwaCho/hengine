/**
 * Asynchronous image loader with progress reporting.
 * Audio asset loading lives in audio/AssetSound.ts (uses AudioContext).
 */
export interface ImageEntry {
  key: string;
  url: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
  lastKey: string;
}

export class AssetLoader {
  private images = new Map<string, HTMLImageElement>();

  /** Load multiple images in parallel. Failures are logged but do not reject. */
  async loadImages(
    entries: readonly ImageEntry[],
    onProgress?: (p: LoadProgress) => void,
  ): Promise<void> {
    const total = entries.length;
    let loaded = 0;
    await Promise.all(
      entries.map(async (entry) => {
        try {
          const img = await loadImageElement(entry.url);
          this.images.set(entry.key, img);
        } catch (err) {
          console.warn(`[hengine] image load failed: ${entry.key} (${entry.url})`, err);
        } finally {
          loaded++;
          onProgress?.({
            loaded,
            total,
            percent: total === 0 ? 100 : Math.round((loaded / total) * 100),
            lastKey: entry.key,
          });
        }
      }),
    );
  }

  getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  hasImage(key: string): boolean {
    return this.images.has(key);
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });
}
