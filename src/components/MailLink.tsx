"use client";

import { useEffect, useRef } from "react";

// Setzt die Mailadresse erst im Browser zu einem mailto:-Link zusammen.
// Im HTML stehen nur die beiden Teile in getrennten Elementen — für Menschen
// sieht die Adresse normal aus und lässt sich als Ganzes markieren und
// kopieren, einfache Adress-Sammler finden aber keine fertige Adresse.
export default function MailLink({ name, domain, className = "" }: { name: string; domain: string; className?: string }) {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (link.current) link.current.href = `mailto:${name}@${domain}`;
  }, [name, domain]);
  return (
    <a ref={link} className={`font-medium text-secondary-text underline underline-offset-2 [overflow-wrap:anywhere] ${className}`}>
      <span>{name}</span>
      <span>@</span>
      <span>{domain}</span>
    </a>
  );
}
