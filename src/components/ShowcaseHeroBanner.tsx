"use client";

import React from "react";
import { useHeaderPictures } from "@/hooks/useHeaderPictures";

interface ShowcaseHeroBannerProps {
  children?: React.ReactNode;
}

export default function ShowcaseHeroBanner({
  children,
}: ShowcaseHeroBannerProps) {
  const { headers, activeHeaderIndex } = useHeaderPictures();

  return (
    <div
      /* 
        Pure uniform aspect-ratio scaling with NO min-h or max-h caps. 
        Width and height scale together in exact proportion, 
        so the image inside stays 100% locked and stable with zero shifting.
      */
      className="relative w-full aspect-[32/9] rounded-[24px] sm:rounded-[28px] overflow-hidden bg-neutral-900 border border-neutral-200/60 dark:border-white/10 shadow-sm flex items-end p-4 sm:p-6 shrink-0"
    >
      {/* Background Carousel */}
      {headers.length > 0 ? (
        headers.map((h, idx) => (
          <img
            key={h.id}
            src={h.url}
            alt="Hero Header"
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              idx === activeHeaderIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        ))
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#f45b95]/40 via-purple-600/30 to-blue-600/40" />
      )}

      {/* Ambient Depth Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

      {/* Foreground Content / Glossy Pill */}
      {children && <div className="relative z-10 w-full">{children}</div>}
    </div>
  );
}