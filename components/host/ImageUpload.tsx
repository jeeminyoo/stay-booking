"use client";

import { useRef, ChangeEvent } from "react";

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
  aspectRatio?: "wide" | "square";
  placeholder?: string;
}

const MAX_SIZE = 1200; // px
const QUALITY = 0.82;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ value, onChange, aspectRatio = "wide", placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const dataUrl = await compressImage(file);
    onChange(dataUrl);
  }

  const heightClass = aspectRatio === "square" ? "h-48" : "h-56";

  if (value) {
    return (
      <div className={`relative rounded-2xl overflow-hidden ${heightClass} bg-gray-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="업로드된 이미지" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 flex items-end justify-end p-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="bg-white/90 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            사진 변경
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`w-full ${heightClass} border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group`}
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
        <svg className="w-7 h-7 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">
          {placeholder ?? "사진 선택"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">앨범 또는 파일에서 선택 · 용량 자동 최적화</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </button>
  );
}
