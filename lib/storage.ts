import { supabase } from "./supabase";

const BUCKET = "property-images";

export const isDataUrl = (url: string) => url.startsWith("data:");

export async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const filePath = `${path}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, { upsert: true, contentType: blob.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
