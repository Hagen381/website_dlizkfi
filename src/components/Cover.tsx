import ExportedImage from "next-image-export-optimizer";
import cover from "@/assets/images/cover.jpg";

// Alle Folgen nutzen im Feed dasselbe Cover — es liegt lokal im Repo
// (kein Laden vom Spotify-CDN).
export default function Cover({ groesse, sizes, className = "", priority = false }: { groesse: number; sizes: string; className?: string; priority?: boolean }) {
  return <ExportedImage src={cover} alt="" width={groesse} height={groesse} sizes={sizes} priority={priority} className={`aspect-square object-cover ${className}`} />;
}
