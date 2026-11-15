"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  User,
  CheckCircle2,
  Crown,
  Star,
  Bot,
} from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  user_number?: number;
  avatar_url?: string;
  banner_url?: string;
  user_colors?: string[];
  role?: string;
  created_at?: string;
  pronouns?: string;
  age?: string;
  timezone?: string;
  activity_level?: string;
  seeking_plots?: string;
  status?: string;
  about_me?: string;
  show_about?: boolean;
  writing_styles?: {
    communication?: number;
    one_liners?: number;
    rapid_fire?: number;
    long_threads?: number;
    development?: number;
    plotting_first?: number;
  };
}

interface CharacterCard {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string;
  cover_url?: string;
  portrait_url?: string;
  is_verified?: boolean;
  followers_count?: number;
  tagline?: string;
  is_npc?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const routeId = params?.id as string | undefined;
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [stats, setStats] = useState({
    posts: 0,
    words: 0,
    characters: 0,
    stories: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Fetch Profile by chronological user_number or current logged-in user
      let query = supabase.from("profiles").select("*");
      if (routeId) {
        query = query.eq("user_number", Number(routeId));
      } else if (user) {
        query = query.eq("id", user.id);
      }

      const { data: profData } = await query.single();

      if (profData) {
        setProfile(profData);

        // 2. Fetch Characters owned by this user
        const { data: charData } = await supabase
          .from("characters")
          .select("id, name, handle, avatar_url, cover_url, portrait_url, is_verified, followers_count, tagline, is_npc")
          .eq("user_id", profData.id)
          .order("created_at", { ascending: false });

        if (charData) setCharacters(charData);

        // 3. Fetch Counters
        const { count: postCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profData.id);

        const { count: charCount } = await supabase
          .from("characters")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profData.id);

        const { count: storyCount } = await supabase
          .from("stories")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profData.id);

        setStats({
          posts: postCount || 0,
          words: (postCount || 0) * 320, // estimate words
          characters: charCount || 0,
          stories: storyCount || 0,
        });
      }

      setLoading(false);
    }

    loadData();
  }, [routeId, user]);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full p-8 text-center text-neutral-400">
        User profile not found.
      </div>
    );
  }

  // Active user theme colors
  const userColors = profile.user_colors?.length ? profile.user_colors : ["#f45b95"];
  const isMultiColor = userColors.length > 1;
  const gradientCss = isMultiColor
    ? `linear-gradient(135deg, ${userColors.join(", ")})`
    : userColors[0];

  const userTextStyle = isMultiColor
    ? {
        backgroundImage: gradientCss,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }
    : { color: userColors[0] };

  // Calculate membership duration
  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recently";

  const isOwner = user?.id === profile.id;

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-20">
      {/* HEADER & HERO GROUP */}
      <div className="w-full flex flex-col gap-2.5">
        {/* 1. TOP HEADER STRIP */}
        <div className="w-full flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-white/[0.08] backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm">
            {isOwner && (
              profile.role === "admin" || profile.role === "moderator" ? (
                <span title={`${profile.role.toUpperCase()} (Private to you)`} className="inline-flex items-center">
                  <Crown size={12} className="text-amber-400 fill-amber-400 drop-shadow-sm shrink-0" />
                </span>
              ) : (
                <span title="Member (Private to you)" className="inline-flex items-center">
                  <Star size={11} className="text-amber-300 fill-amber-300 drop-shadow-sm shrink-0" />
                </span>
              )
            )}
            <span className="text-[11px] font-black uppercase tracking-wider transition-colors" style={userTextStyle}>
              Profile
            </span>
          </div>

          {isOwner && (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-white/[0.08] hover:bg-white/95 backdrop-blur-md border border-white/50 dark:border-white/10 text-neutral-700 dark:text-neutral-200 text-[11px] font-bold shadow-sm transition group"
            >
              <Settings size={12} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition" />
              <span>Settings</span>
            </Link>
          )}
        </div>

        {/* 2. HERO BANNER & AVATAR BLOCK */}
        <div className="w-full flex flex-col bg-[#14151b] rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800 shadow-sm">
          <div className="w-full h-44 sm:h-52 bg-neutral-900 relative overflow-hidden">
            {profile.banner_url ? (
              <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full opacity-35" style={{ background: gradientCss }} />
            )}
          </div>

          <div className="w-full px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-sm -mt-12 z-10 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-white/20 shadow-xl shrink-0 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-white">
                    {(profile.display_name || profile.username || "U").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2">
                  <span style={userTextStyle}>
                    {profile.display_name || profile.username}
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                  <span>@{profile.username}</span>
                  <span>·</span>
                  <span>JOINED {joinedDate.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATS CHIPS */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: "POSTS", value: stats.posts },
          { label: "WORDS", value: stats.words },
          { label: "CHARACTERS", value: stats.characters },
          { label: "STORIES", value: stats.stories },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col px-4 py-2 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/80 dark:border-neutral-800 shadow-sm min-w-20"
          >
            <span className="text-base font-black text-neutral-900 dark:text-white leading-tight">
              {item.value.toLocaleString()}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* 4. BALANCED TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">PRONOUNS</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase mt-0.5 truncate">
                {profile.pronouns || "Not set"}
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">AGE</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase mt-0.5 truncate">
                {profile.age || "Not set"}
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">ACTIVITY</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase mt-0.5 truncate">
                {profile.activity_level || "Not set"}
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">SEEKING PLOTS</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase mt-0.5 truncate">
                {profile.seeking_plots || "Not set"}
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800 col-span-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">STATUS</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase mt-0.5 truncate">
                {profile.status || "No active status"}
              </span>
            </div>
          </div>

          {profile.show_about !== false && (
            <div className="flex-1 flex flex-col p-4 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-1">ABOUT</span>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {profile.about_me || "Nothing written yet."}
              </p>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#14151b] border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between gap-3.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">WRITING STYLE</span>

          {(
            [
              { key: "communication", label: "COMMUNICATION" },
              { key: "one_liners", label: "ONE-LINERS" },
              { key: "rapid_fire", label: "RAPID FIRE" },
              { key: "long_threads", label: "LONG THREADS" },
              { key: "development", label: "DEVELOPMENT" },
              { key: "plotting_first", label: "PLOTTING FIRST" },
            ] as const
          ).map((item) => {
            const pct = profile.writing_styles?.[item.key] ?? 0;
            return (
              <div key={item.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] text-neutral-500">{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: gradientCss }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CHARACTERS SHOWCASE */}
      <div className="flex flex-col gap-3 pt-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400">
          CHARACTERS
        </h2>

        {characters.length === 0 ? (
          <div className="w-full p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 text-center text-xs text-neutral-400 font-bold">
            No characters created yet.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 w-full">
            {characters.map((char) => (
              <CharacterCardItem key={char.id} character={char} actionType="view" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCardItem({
  character,
  actionType,
}: {
  character: CharacterCard;
  actionType: "view" | "edit";
}) {
  return (
    <Link
      href={`/phone/${character.handle || character.id}`}
      className="group relative w-full h-[238px] rounded-[24px] overflow-hidden border border-neutral-200/80 dark:border-white/10 bg-neutral-900 shadow-sm flex flex-col justify-between p-3.5 select-none shrink-0"
    >
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {character.portrait_url || character.cover_url || character.avatar_url ? (
          <img
            src={character.portrait_url || character.cover_url || character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center font-black text-white/30 text-4xl">
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {character.is_npc ? (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold shadow-sm">
            <Bot size={11} className="text-[#f45b95]" />
            <span>NPC</span>
          </div>
        ) : character.is_verified ? (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-[10px] font-bold shadow-sm">
            <CheckCircle2 size={11} className="text-sky-400 fill-sky-400/20" />
            <span>Verified</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white text-[10px] font-bold shadow-sm">
            <User size={10} className="text-neutral-300" />
            <span>
              {character.followers_count
                ? `${character.followers_count.toLocaleString()} followers`
                : "Following"}
            </span>
          </div>
        )}

        <h3 className="mt-2 text-center text-sm font-black text-white uppercase tracking-wider drop-shadow-md truncate w-full px-1">
          {character.name}
        </h3>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 shrink-0 border border-white/20 shadow-sm">
            {character.avatar_url ? (
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white">
                {character.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">
              @{character.handle || "user"}
            </span>
            {character.tagline && (
              <span className="text-[8px] text-neutral-300 truncate drop-shadow-sm">
                {character.tagline}
              </span>
            )}
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-white/90 hover:bg-white text-neutral-900 text-[10px] font-black shadow-md shrink-0 transition">
          {actionType === "edit" ? "Edit" : "View"}
        </div>
      </div>
    </Link>
  );
}