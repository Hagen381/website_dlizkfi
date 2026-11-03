"use client";

import { useEffect } from "react";
import { mitBasePath } from "@/lib/base-path";

// PodView blätterte mit /episodes/?page=2. Alte Links dieser Art leitet die
// .htaccess per 301 um; dies ist die Absicherung im Browser (z. B. Vorschau).
export default function AltePaginierung({ maxSeite }: { maxSeite: number }) {
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("page"));
    if (Number.isInteger(n) && n >= 2 && n <= maxSeite) window.location.replace(mitBasePath(`/episodes/page/${n}/`));
  }, [maxSeite]);
  return null;
}
