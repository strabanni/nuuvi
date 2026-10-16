"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Play, FileText, Calendar as CalendarIcon, MapPin, CloudRain, Sparkles } from "lucide-react";
import ShowcaseHeroBanner from "@/components/ShowcaseHeroBanner";

export default function HomePage() {
  const { user } = useAuth();
  const [charactersCount, setCharactersCount] = useState<number>(0);
  
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    async function getCount() {
      const { count } = await supabase
        .from("characters")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId);

      setCharactersCount(count || 0);
    }

    getCount();
  }, [user]);

  return (
    <main className="h-full flex flex-col gap-5 font-sans pb-24 text-neutral-900 dark:text-white transition-colors duration-200">
      {/* 1. ROTATING SHOWCASE HERO BANNER WITH GLOSSY PILL */}
      <ShowcaseHeroBanner>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/45 dark:bg-black/55 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.5)] w-fit">
          <Sparkles size={13} className="text-[#f45b95]" />
          <span className="text-xs font-black tracking-wider text-white uppercase drop-shadow-sm">
            ARDELL CITY
          </span>
        </div>
      </ShowcaseHeroBanner>

      {/* 2. LOWER CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions Card */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-sm border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between transition-colors duration-200">
          <div>
            <h3 className="text-base font-extrabold text-neutral-800 dark:text-white tracking-tight">
              Start writing
            </h3>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              2 stories · {charactersCount} {charactersCount === 1 ? "character" : "characters"}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-6 flex-wrap">
            <Link
              href="/lore"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] border border-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/60 dark:text-neutral-200 text-xs font-semibold shadow-sm transition"
            >
              <Play size={12} className="fill-current text-neutral-600 dark:text-neutral-400" />
              <span>New episode</span>
            </Link>
            <Link
              href="/nu"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] border border-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/60 dark:text-neutral-200 text-xs font-semibold shadow-sm transition"
            >
              <FileText size={12} className="text-neutral-600 dark:text-neutral-400" />
              <span>New post</span>
            </Link>
            <Link
              href="/calendar"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] border border-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/60 dark:text-neutral-200 text-xs font-semibold shadow-sm transition"
            >
              <CalendarIcon size={12} className="text-neutral-600 dark:text-neutral-400" />
              <span>New event</span>
            </Link>
            <Link
              href="/lore"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] border border-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/60 dark:text-neutral-200 text-xs font-semibold shadow-sm transition"
            >
              <MapPin size={12} className="text-neutral-600 dark:text-neutral-400" />
              <span>New plan</span>
            </Link>
          </div>
        </div>

        {/* Weather / Date Calendar Widget */}
        <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-sm border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-2">
            <span>October 2026</span>
            <Link
              href="/calendar"
              className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-medium transition"
            >
              Calendar
            </Link>
          </div>

          <div className="bg-[#edf0f5] border border-neutral-200/80 dark:bg-neutral-800 dark:border-neutral-700/60 rounded-2xl p-3 flex items-center gap-3 shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-200 shadow-sm">
              <CloudRain size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-800 dark:text-white">66° / 51°F</div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                Foggy in Ardell City today.
              </div>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 font-medium text-center pt-2">
            Nothing planned today.
          </div>
        </div>
      </div>
    </main>
  );
}