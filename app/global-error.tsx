"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
          <p className="text-4xl mb-4">😵</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">문제가 발생했어요</h1>
          <p className="text-sm text-gray-500 mb-6">잠시 후 다시 시도해주세요</p>
          <button
            onClick={reset}
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
