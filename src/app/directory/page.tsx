"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import ShowcaseHeroBanner from "@/components/ShowcaseHeroBanner";
import CreateCharacterModal from "@/components/CreateCharacterModal";
import {
  Search,
  User,
  Plus,
  MapPin,
  Bot,
} from "lucide-react";

type DirectoryTab = "Your Roster" | "Do You Know Them?" | "Second Glances" | "Brands" | "Walk the City";

interface Character {
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
  npc_tag?: string;
  user_id: string;
  character_number?: number | null;
  writer_number?: number | null;
  owner?: {
    username: string;
    display_name: string;
    avatar_url?: string;
    user_number?: number;
  };
}

export default function DirectoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<DirectoryTab>("Do You Know Them?");
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
        user_id,
        character_number
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching characters:", error.message);
      setLoading(false);
      return;
    }

    if (charData) {
      const userIds = Array.from(
        new Set(charData.map((character) => character.user_id).filter(Boolean))
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, user_number")
        .in("id", userIds);

      console.log("Profiles lookup:", {
        userIds,
        profilesData,
        profilesError,
      });

      const profileMap = Object.fromEntries(
        (profilesData ?? []).map((profile) => [String(profile.id), profile])
      );

      const formatted: Character[] = charData.map((character) => {
        const owner = profileMap[String(character.user_id)];

        return {
          ...character,
          writer_number: owner?.user_number ?? null,
          owner: owner ?? {
            username: "writer",
            display_name: "Writer",
          },
        };
      });

      console.log(
        "Character URL data:",
        formatted.map(({ id, user_id, writer_number, character_number }) => ({
          id,
          user_id,
          writer_number,
          character_number,
        }))
      );

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

  const doYouKnowThemSorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
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
      
      {/* 2. ROTATING SHOWCASE HERO BANNER WITH GLOSSY STATS PILL */}
      <ShowcaseHeroBanner>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-2.5 rounded-[22px] sm:rounded-full bg-black/45 dark:bg-black/55 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.5)] w-fit">
          <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase drop-shadow-sm whitespace-nowrap">
            WHAT&apos;S IN ARDELL CITY?
          </span>

          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/40" />

          {/* Dynamic Stat Chips with extra spacing */}
          <div className="flex items-center gap-3 text-xs font-bold text-neutral-200">
            <span>
              <strong className="text-[#f45b95] font-black">{writersCount}</strong>&nbsp;&nbsp;&nbsp;&nbsp;{writersCount === 1 ? "Writer" : "Writers"}
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#f45b95] font-black">{charactersCount}</strong>&nbsp;&nbsp;&nbsp;&nbsp;{charactersCount === 1 ? "Character" : "Characters"}
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#f45b95] font-black">{locationsCount}</strong>&nbsp;&nbsp;&nbsp;&nbsp;{locationsCount === 1 ? "Location" : "Locations"}
            </span>
          </div>
        </div>
      </ShowcaseHeroBanner>

      {/* 3. SEARCH & DIRECTORY CAPSULE PILL BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Shorter search bar */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search names, usernames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none shadow-sm focus:border-[#f45b95]"
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#f0f2f7] dark:bg-[#16171f] border border-neutral-300/70 dark:border-white/[0.08] shadow-sm overflow-x-auto">
          {(["Your Roster", "Do You Know Them?", "Second Glances", "Brands", "Walk the City"] as DirectoryTab[]).map(
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

      {/* TAB A: YOUR ROSTER */}
      {activeTab === "Your Roster" && (
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-5 w-full">
            {myCast.map((char) => (
              <CharacterCardItem key={char.id} character={char} currentUserId={user?.id} isMeTab={true} />
            ))}
          </div>
        </div>
      )}

      {/* TAB B: DO YOU KNOW THEM? (Alphabetical view) */}
      {activeTab === "Do You Know Them?" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-5 w-full">
            {doYouKnowThemSorted.map((char) => (
              <CharacterCardItem key={char.id} character={char} currentUserId={user?.id} isMeTab={false} />
            ))}
          </div>
        </div>
      )}

      {/* TAB C: SECOND GLANCES (NPCs) */}
      {activeTab === "Second Glances" && (
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

          <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-5 w-full">
            {npcsList.map((char) => (
              <CharacterCardItem key={char.id} character={char} currentUserId={user?.id} isMeTab={false} />
            ))}
          </div>
        </div>
      )}

      {/* TAB D & E: BRANDS & WALK THE CITY (LOCATIONS) PLACEHOLDER */}
      {(activeTab === "Brands" || activeTab === "Walk the City") && (
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

function CharacterCardItem({
  character,
  currentUserId,
  isMeTab = false,
}: {
  character: Character;
  currentUserId?: string;
  isMeTab?: boolean;
}) {
  const router = useRouter();
  const isOwner = currentUserId && character.user_id === currentUserId;
  const profileHref =
  character.writer_number != null && character.character_number != null
    ? `/${character.writer_number}/c/${character.character_number}`
    : `/phone/${character.id}`;
  const editHref = `/characters/${character.id}/edit`;

  console.log({
    writer_number: character.writer_number,
    character_number: character.character_number,
    profileHref,
  });

  const showEdit = isMeTab && isOwner;

  return (
    <div
      onClick={() => router.push(profileHref)}
      className="group relative w-full h-[360px] rounded-[30px] overflow-hidden border border-neutral-200/80 dark:border-white/10 bg-neutral-900 shadow-md flex flex-col justify-between p-4.5 select-none shrink-0 cursor-pointer transition-transform hover:-translate-y-1"
    >
      {/* Background Portrait / Cover Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {character.portrait_url || character.cover_url || character.avatar_url ? (
          <img
            src={character.portrait_url || character.cover_url || character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center font-black text-white/30 text-5xl">
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />
      </div>

      {/* Top Header Badge & Character Name with Wrapping and Custom Verified Badge */}
      <div className="relative z-10 flex flex-col items-center pt-1.5">
        {character.is_npc && (
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xs font-extrabold shadow-sm mb-1">
            <Bot size={13} className="text-[#f45b95]" />
            <span>NPC</span>
          </div>
        )}

        <h3 className="mt-2 text-center text-xl font-black text-white uppercase tracking-wider drop-shadow-md px-2 leading-tight flex items-center justify-center gap-1.5 flex-wrap">
          <span className="break-words">{character.name}</span>
          {character.is_verified && (
            <span title="Verified Account" className="inline-flex items-center shrink-0">
              <img
                src="/verify.png"
                alt="Verified"
                className="w-4.5 h-4.5 object-contain drop-shadow-sm"
              />
            </span>
          )}
        </h3>
      </div>

      {/* Bottom Freestanding Elements */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {/* Thicker border around the small avatar icon */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 shrink-0 border-2 border-white/60 shadow-sm">
            {character.avatar_url ? (
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                {character.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-xs font-extrabold text-white truncate drop-shadow-md">
              @{character.handle || "user"}
            </span>
            {character.tagline && (
              <span className="text-[11px] font-semibold text-neutral-200 truncate drop-shadow-md">
                {character.tagline}
              </span>
            )}
          </div>
        </div>

        {/* Smart Button: EDIT only in the 'Me' tab, VIEW everywhere else */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(showEdit ? editHref : profileHref);
          }}
          className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-black shadow-lg shrink-0 transition"
        >
          {showEdit ? "EDIT" : "VIEW"}
        </button>
      </div>
    </div>
  );
}