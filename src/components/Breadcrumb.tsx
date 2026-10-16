"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Optional readable name mappings for special routes
const ROUTE_LABELS: Record<string, string> = {
  nu: "THE NU",
  admin: "ADMIN",
  lore: "LORE",
  stories: "STORIES",
  characters: "CHARACTERS",
  directory: "DIRECTORY",
  messages: "MESSAGES",
  archive: "ARCHIVE",
};

export default function Breadcrumb() {
  const pathname = usePathname();

  // Split paths: e.g. "/stories/sellout/episodes" -> ["stories", "sellout", "episodes"]
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase">
      {/* Root brand anchor */}
      <Link href="/" className="text-neutral-500 hover:text-neutral-800 transition-colors">
        NUUVI
      </Link>

      {/* Pink Dot Divider */}
      <span className="text-[#f45b95] font-black select-none tracking-tight">···</span>

      {/* If root home page, show HOME */}
      {segments.length === 0 ? (
        <span className="text-neutral-400">HOME</span>
      ) : (
        segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = ROUTE_LABELS[segment.toLowerCase()] || decodeURIComponent(segment).replace(/-/g, " ");

          return (
            <React.Fragment key={href}>
              {isLast ? (
                <span className="text-neutral-400">{label}</span>
              ) : (
                <Link href={href} className="text-neutral-500 hover:text-neutral-800 transition-colors">
                  {label}
                </Link>
              )}

              {/* Add pink divider between intermediate segments */}
              {!isLast && (
                <span className="text-[#f45b95] font-black select-none tracking-tight">···</span>
              )}
            </React.Fragment>
          );
        })
      )}
    </nav>
  );
}