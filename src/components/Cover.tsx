import ExportedImage from "next-image-export-optimizer";
import cover from "@/assets/images/cover.jpg";
import { basePath } from "@/lib/base-path";

// Alle Folgen nutzen im Feed dasselbe Cover — es liegt lokal im Repo
// (kein Laden vom Spotify-CDN).
//
// WICHTIG: next-image-export-optimizer kennt den basePath nur über die Prop
// `basePath`. Ohne sie zeigen src/srcSet in der GitHub-Pages-Vorschau auf
// /nextImageExportOptimizer/… statt /website_dlizkfi/nextImageExportOptimizer/…
// (404). Deshalb läuft JEDES Bild über diese Komponente — ExportedImage nie
// direkt verwenden. Die Vorschau-Pipeline prüft das
// (scripts/vorschau-pfade-pruefen.mjs).
export default function Cover({ groesse, sizes, className = "", priority = false }: { groesse: number; sizes: string; className?: string; priority?: boolean }) {
  return (
    <ExportedImage
      src={cover}
      alt=""
      width={groesse}
      height={groesse}
      sizes={sizes}
      priority={priority}
      basePath={basePath || undefined}
      // Ohne Unschärfe-Vorschau: die Blur-Bilder werden nicht erzeugt
      // (nextImageExportOptimizer_generateAndUseBlurImages = false). Mit dem
      // Standard "blur" würde jede Seite ein …-opt-10.WEBP anfragen (404).
      placeholder="empty"
      className={`aspect-square object-cover ${className}`}
    />
  );
}
