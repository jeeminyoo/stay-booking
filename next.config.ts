import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // 소스맵 업로드: 에러 발생 시 압축된 코드 대신 원본 코드 위치 표시
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  silent: true,
});
