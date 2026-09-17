import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse(내부 pdfjs-dist)는 번들하면 pdf.worker.mjs를 못 찾음 → node_modules에서 직접 로드
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
