"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import ShowcaseHeroBanner from "@/components/ShowcaseHeroBanner";
import CreateCharacterModal from "@/components/CreateCharacterModal";
import {
  Search,
  CheckCircle2,
  User,
  Plus,
  MapPin,
  Bot,
} from "lucide-react";

type DirectoryTab = "Me" | "By Writer" | "All Characters" | "NPCs" | "Brands" | "Locations";

interface Character {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string;
  cover_url?: string;
  portrait_url?: string; // <--- Added here
  is_verified?: boolean;
  followers_count?: number;
  tagline?: string;
  is_npc?: boolean;
  npc_tag?: string;
  user_id: string;
  owner?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function DirectoryPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<DirectoryTab>("By Writer");
  const [searchQuery, setSearchQuery] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Realtime Counters
  const [writersCount, setWritersCount] = useState<number>(0);
  const [charactersCount, setCharactersCount] = useState<number>(0);
  const [locationsCount, setLocationsCount] = useState<number>(0);

  // Character Modal States
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [createModalIsNpc, setCreateModalIsNpc] = useState(false);

  // 1. Resilient character fetch
  const loadCharacters = async () => {
    setLoading(true);

    const { data: charData, error } = await supabase
      .from("characters")
      .select(`
        id, 
        name, 
        handle, 
        avatar_url, 
        cover_url, 
        portrait_url,
        is_verified, 
        followers_count, 
        tagline, 
        is_npc, 
        npc_tag,
        user_id
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching characters:", error.message);
      setLoading(false);
      return;
    }

    if (charData) {
      // Fetch corresponding profiles for owners
      const userIds = Array.from(new Set(charData.map((c) => c.user_id).filter(Boolean)));
      
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        if (profilesData) {
          profileMap = Object.fromEntries(profilesData.map((p) => [p.id, p]));
        }
      }

      const formatted: Character[] = charData.map((c: any) => ({
        ...c,
        owner: profileMap[c.user_id] || {
          username: "writer",
          display_name: "Writer",
        },
      }));

      setCharacters(formatted);
    }
    setLoading(false);
  };

  // Load and subscribe to live counts
  useEffect(() => {
    async function fetchDirectoryCounts() {
      const { count: writerTotal } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: charTotal } = await supabase
        .from("characters")
        .select("*", { count: "exact", head: true });

      const { count: locTotal } = await supabase
        .from("locations")
        .select("*", { count: "exact", head: true });

      setWritersCount(writerTotal || 0);
      setCharactersCount(charTotal || 0);
      setLocationsCount(locTotal || 0);
    }

    fetchDirectoryCounts();
    loadCharacters();

    const dirChannel = supabase
      .channel("directory-live-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDirectoryCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "characters" }, () => {
        fetchDirectoryCounts();
        loadCharacters();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => fetchDirectoryCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(dirChannel);
    };
  }, []);

  // Search Filter Logic
  const filtered = useMemo(() => {
    let result = characters;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.tagline?.toLowerCase().includes(q) ||
          c.owner?.username.toLowerCase().includes(q)
      );
    }

    return result;
  }, [characters, searchQuery]);

  // Groupings
  const myCast = useMemo(() => {
    if (!user?.id) return [];
    return filtered.filter(
      (c) => String(c.user_id).trim().toLowerCase() === String(user.id).trim().toLowerCase()
    );
  }, [filtered, user]);

  const writersGrouped = useMemo(() => {
    const map = new Map<string, { owner: Character["owner"]; chars: Character[] }>();
    filtered.forEach((c) => {
      if (!c.owner) return;
      const key = c.owner.username;
      if (!map.has(key)) {
        map.set(key, { owner: c.owner, chars: [] });
      }
      map.get(key)!.chars.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const alphabeticalGrouped = useMemo(() => {
    const groups: { [letter: string]: Character[] } = {};
    filtered.forEach((c) => {
      const firstChar = (c.name[0] || "#").toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    });
    return Object.keys(groups)
      .sort()
      .map((letter) => ({ letter, chars: groups[letter] }));
  }, [filtered]);

  const npcsList = useMemo(
    () => filtered.filter((c) => c.is_npc === true),
    [filtered]
  );

  const openCharacterModal = (isNpcMode = false) => {
    setCreateModalIsNpc(isNpcMode);
    setIsCharacterModalOpen(true);
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-24 text-neutral-900 dark:text-white transition-colors duration-200">
      {/* 1. DIRECTORY HEADER */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          Directory
        </h1>
      </div>

      {/* 2. ROTATING SHOWCASE HERO BANNER WITH GLOSSY STATS PILL */}
      <ShowcaseHeroBanner>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-2.5 rounded-[22px] sm:rounded-full bg-black/45 dark:bg-black/55 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.5)] w-fit">
          <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase drop-shadow-sm whitespace-nowrap">
            WHAT&apos;S IN ARDELL CITY?
          </span>

          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/40" />

          {/* Dynamic Stat Chips */}
          <div className="flex items-center gap-3 text-xs font-bold text-neutral-200">
            <span>
              <strong className="text-[#f45b95] font-black">{writersCount}</strong>{" "}
              {writersCount === 1 ? "Writer" : "Writers"}
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#f45b95] font-black">{charactersCount}</strong>{" "}
              {charactersCount === 1 ? "Character" : "Characters"}
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#f45b95] font-black">{locationsCount}</strong>{" "}
              {locationsCount === 1 ? "Location" : "Locations"}
            </span>
          </div>
        </div>
      </ShowcaseHeroBanner>

      {/* 3. SEARCH & DIRECTORY CAPSULE PILL BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search names, usernames, taglines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none shadow-sm focus:border-[#f45b95]"
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#f0f2f7] dark:bg-[#16171f] border border-neutral-300/70 dark:border-white/[0.08] shadow-sm overflow-x-auto">
          {(["Me", "By Writer", "All Characters", "NPCs", "Brands", "Locations"] as DirectoryTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-neutral-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.08)] border border-neutral-200/80 dark:bg-[#282a36] dark:text-white dark:border-white/10"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB A: ME */}
      {activeTab === "Me" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 translate-x-[15px]">
              {myCast.length} characters in your cast
            </span>
            <button
              type="button"
              onClick={() => openCharacterModal(false)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#1e2029] dark:hover:bg-[#282a36] text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300/70 dark:border-neutral-700/70 transition shadow-sm"
            >
              <Plus size={13} />
              <span>New character</span>
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 w-full">
            {myCast.map((char) => (
              <CharacterCardItem key={char.id} character={char} actionType="edit" />
            ))}
          </div>
        </div>
      )}

      {/* TAB B: BY WRITER */}
      {activeTab === "By Writer" && (
        <div className="flex flex-col gap-8">
          {writersGrouped.map(([username, group]) => (
            <div key={username} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-900 border border-white/20 shrink-0">
                  {group.owner?.avatar_url ? (
                    <img src={group.owner.avatar_url} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-white flex items-center justify-center w-full h-full">
                      {username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Reordered Layout: Username first, then display name + characters count */}
                <div className="flex flex-col">
                  <span className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                    @{username}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {group.owner?.display_name} · {group.chars.length} characters
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 w-full">
                {group.chars.map((char) => (
                  <CharacterCardItem key={char.id} character={char} actionType="edit" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB C: ALL CHARACTERS */}
      {activeTab === "All Characters" && (
        <div className="flex flex-col gap-7">
          {alphabeticalGrouped.map(({ letter, chars }) => (
            <div key={letter} className="flex flex-col gap-3">
              <span className="text-xs font-black text-neutral-400 uppercase px-1">{letter}</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 w-full">
                {chars.map((char) => (
                  <CharacterCardItem key={char.id} character={char} actionType="edit" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB D: NPCS */}
      {activeTab === "NPCs" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-white dark:bg-[#16171f] text-xs font-bold border border-neutral-200 dark:border-white/10 shadow-sm">
              All NPCs
            </span>
            <button
              type="button"
              onClick={() => openCharacterModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#1e2029] dark:hover:bg-[#282a36] text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300/70 dark:border-neutral-700/70 transition shadow-sm"
            >
              <Plus size={13} />
              <span>Add an NPC</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-400">
            Anyone can tag these NPCs into their episodes. Mark your own characters as NPCs in their editor.
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 w-full">
            {npcsList.map((char) => (
              <CharacterCardItem key={char.id} character={char} actionType="edit" />
            ))}
          </div>
        </div>
      )}

      {/* TAB E & F: BRANDS & LOCATIONS PLACEHOLDER */}
      {(activeTab === "Brands" || activeTab === "Locations") && (
        <div className="w-full p-16 rounded-[28px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] text-center flex flex-col items-center justify-center gap-3">
          <MapPin size={28} className="text-[#f45b95]" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            {activeTab} directory loaded
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            Ready to configure individual {activeTab.toLowerCase()} maps, cards, and metadata.
          </p>
        </div>
      )}

      {/* CREATE CHARACTER MODAL */}
      <CreateCharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        defaultIsNpc={createModalIsNpc}
        onCharacterCreated={() => {
          loadCharacters();
        }}
      />
    </div>
  );
}

// Character Card Component (Fixed 190px × 238px static size, filling grid tracks)
function CharacterCardItem({
  character,
  actionType,
}: {
  character: Character;
  actionType: "view" | "edit";
}) {
  return (
    <Link
      href={
        actionType === "edit"
          ? `/characters/${character.id}/edit`
          : `/phone/${character.handle || character.id}`
      }
      className="group relative w-full h-[300px] w-[300px] rounded-[24px] overflow-hidden border border-neutral-200/80 dark:border-white/10 bg-neutral-900 shadow-sm flex flex-col justify-between p-3.5 select-none shrink-0"
    >
      {/* Background Portrait Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {character.portrait_url || character.cover_url || character.avatar_url ? (
          <img
            src={character.portrait_url || character.cover_url || character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center font-black text-white/30 text-4xl">
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Ambient Dark Gradient Vignette for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* Top Header Badge & Character Name */}
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

      {/* Bottom Freestanding Elements */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 shrink-0 border border-white/20 shadow-sm">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
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