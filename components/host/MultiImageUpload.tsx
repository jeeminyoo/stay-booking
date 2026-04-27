"use client";

import { useRef, useState } from "react";
import { ImageEntry } from "@/lib/types";
import { processImageVariants } from "@/lib/storage";

interface Props {
  images: ImageEntry[];
  maxCount: number;
  onChange: (images: ImageEntry[]) => void;
  required?: boolean;
}

export default function MultiImageUpload({ images, maxCount, onChange, required = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [fileHashes] = useState(() => new Set<string>());
  const fileHashByIdRef = useRef<Map<string, string>>(new Map());

  async function handleFiles(files: FileList) {
    const remaining = maxCount - images.length;
    if (remaining <= 0) return;

    const selected = Array.from(files);
    if (selected.length > remaining) {
      alert(`사진은 최대 ${maxCount}장까지 등록할 수 있습니다.\n${remaining}장만 추가할 수 있어요.`);
      return;
    }

    const allFiles = selected;
    const dupes = allFiles.filter(f => fileHashes.has(`${f.name}-${f.size}-${f.lastModified}`));
    if (dupes.length > 0) {
      alert("이미 등록된 사진입니다.");
      return;
    }

    const toProcess = allFiles;
    setProcessing(true);
    try {
      const entries = await Promise.all(toProcess.map(async (file) => {
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = (e) => res(e.target?.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const { thumbDataUrl, mainDataUrl } = await processImageVariants(dataUrl);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          thumb_url: thumbDataUrl,
          main_url: mainDataUrl,
        } satisfies ImageEntry;
      }));
      toProcess.forEach((f, i) => {
        const hash = `${f.name}-${f.size}-${f.lastModified}`;
        fileHashes.add(hash);
        fileHashByIdRef.current.set(entries[i].id, hash);
      });
      onChange([...images, ...entries]);
    } finally {
      setProcessing(false);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function remove(idx: number) {
    const id = images[idx].id;
    const hash = fileHashByIdRef.current.get(id);
    if (hash) { fileHashes.delete(hash); fileHashByIdRef.current.delete(id); }
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Guide */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          첫 번째 사진이 대표 썸네일로 사용됩니다. (최대 {maxCount}장)
          {required && images.length === 0 && <span className="text-red-400 ml-1">· 필수</span>}
        </span>
        <span className={`font-medium ${images.length >= maxCount ? "text-indigo-600" : "text-gray-400"}`}>
          {images.length}/{maxCount}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.thumb_url} alt="" className="w-full h-full object-cover" />

            {/* Order badge */}
            <div className="absolute top-1.5 left-1.5">
              {idx === 0
                ? <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">대표</span>
                : <span className="text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">{idx + 1}</span>}
            </div>

            {/* Remove */}
            <button type="button" onClick={() => remove(idx)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors">
              ✕
            </button>

            {/* Reorder arrows — always visible on mobile, hover on desktop */}
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                className="w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/80 transition-colors">
                ‹
              </button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === images.length - 1}
                className="w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/80 transition-colors">
                ›
              </button>
            </div>
          </div>
        ))}

        {/* Add button */}
        {images.length < maxCount && (
          <button type="button" onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group disabled:opacity-50">
            {processing
              ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              : <>
                  <span className="text-2xl text-gray-300 group-hover:text-indigo-400 leading-none">+</span>
                  <span className="text-[10px] text-gray-400 group-hover:text-indigo-500">
                    {images.length === 0 ? "필수" : "선택"}
                  </span>
                </>
            }
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
        className="hidden"
      />
    </div>
  );
}
