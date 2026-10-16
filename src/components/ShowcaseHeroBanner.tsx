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
        Aspect ratio locked: 
        - 16/7 on mobile for compact vertical ergonomics
        - 21/9 cinematic ultra-wide on tablet/desktop (min 190px, max 300px)
        - Shape and corner squircle geometry stay strictly uniform
      */
      className="relative w-full aspect-[16/7] sm:aspect-[21/9] min-h-[190px] max-h-[300px] rounded-[28px] sm:rounded-[32px] overflow-hidden bg-neutral-900 border border-neutral-200/60 dark:border-white/10 shadow-sm flex items-end p-5 sm:p-7 shrink-0 transition-[aspect-ratio,height] duration-200"
    >
      {/* Background Carousel: Locked to full width/height of container */}
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