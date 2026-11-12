import type { NextConfig } from "next";

// Nur fuer den GitHub-Pages-Vorschaubuild gesetzt (siehe
// .github/workflows/gh-pages.yml). Der All-Inkl-Build laeuft ohne
// Umgebungsvariable und damit im Wurzelverzeichnis der Domain.
const basePath = process.env.NEXT_BUILD_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: {
    loader: "custom",
    // 480: kleinere Variante für schmale Bildschirme (Kartenbild auf /blog/, LCP mobil)
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 480],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  transpilePackages: ["next-image-export-optimizer"],
  env: {
    nextImageExportOptimizer_imageFolderPath: "public/images",
    nextImageExportOptimizer_exportFolderPath: "out",
    nextImageExportOptimizer_quality: "75",
    nextImageExportOptimizer_storePicturesInWEBP: "true",
    nextImageExportOptimizer_exportFolderName: "nextImageExportOptimizer",
    nextImageExportOptimizer_generateAndUseBlurImages: "false",
    nextImageExportOptimizer_remoteImageCacheTTL: "0",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
