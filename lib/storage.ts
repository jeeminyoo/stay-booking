import { supabase } from "./supabase";
import { ImageEntry } from "./types";

const BUCKET = "property-images";

export const isDataUrl = (url: string) => typeof url === "string" && url.startsWith("data:");

// ─── Browser-side image processing ──────────────────────────────────────────

function toDataUrl(dataUrl: string, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      const webp = canvas.toDataURL("image/webp", quality);
      resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

// Returns { thumbDataUrl (600px), mainDataUrl (1600px) }
export async function processImageVariants(dataUrl: string): Promise<{ thumbDataUrl: string; mainDataUrl: string }> {
  const [thumbDataUrl, mainDataUrl] = await Promise.all([
    toDataUrl(dataUrl, 800, 0.88),
    toDataUrl(dataUrl, 1920, 0.90),
  ]);
  return { thumbDataUrl, mainDataUrl };
}

// ─── Supabase upload ─────────────────────────────────────────────────────────

async function uploadBlob(blob: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

// Upload both variants of an ImageEntry. If URLs are already uploaded, no-op.
// basePath: e.g. "stays/prop-123/cover" or "stays/prop-123/rooms/room-0"
export async function uploadImageEntry(entry: ImageEntry, basePath: string): Promise<ImageEntry> {
  const ext = "webp";
  const [thumbUrl, mainUrl] = await Promise.all([
    isDataUrl(entry.thumb_url)
      ? uploadBlob(await dataUrlToBlob(entry.thumb_url), `${basePath}/${entry.id}_thumb.${ext}`)
      : entry.thumb_url,
    isDataUrl(entry.main_url)
      ? uploadBlob(await dataUrlToBlob(entry.main_url), `${basePath}/${entry.id}_main.${ext}`)
      : entry.main_url,
  ]);
  return { id: entry.id, thumb_url: thumbUrl, main_url: mainUrl };
}

// Legacy single-image upload (backward compat)
export async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  return uploadBlob(blob, `${path}.${blob.type === "image/png" ? "png" : "jpg"}`);
}
