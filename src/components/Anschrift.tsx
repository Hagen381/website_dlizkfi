import { siteConfig } from "@/lib/site-config";

// Name und Anschrift der verantwortlichen Person aus site-config.
export default function Anschrift() {
  const v = siteConfig.verantwortlich;
  return (
    <>
      {v.name}
      {v.anschrift.map((zeile) => (
        <span key={zeile}>
          <br />
          {zeile}
        </span>
      ))}
    </>
  );
}
