"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Heart,
  MessageCircle,
  Send,
  Plus,
  Play,
  Image as ImageIcon,
  PenTool,
  Link2,
  MapPin,
  Video,
  Mic,
  Radio,
  Type,
  MoreHorizontal,
} from "lucide-react";

interface Character {
  id: string;
  name: string;
  handle?: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  user_id: string;
  character_id: string | null;
  post_type: "post" | "musing" | "connection" | "episode" | "event";
  content: string;
  image_urls?: string[];
  location?: string;
  song_title?: string;
  behind_the_post?: string;
  connection_seeking?: string;
  connection_slots?: number;
  tags?: string[];
  likes_count: number;
  created_at: string;
  characters?: Character | null;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function TheNuPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [cast, setCast] = useState<Character[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("Feed");

  // Dropdown & Modal states
  const [showTopDropdown, setShowTopDropdown] = useState(false);
  const [modalMode, setModalMode] = useState<"post" | "connection" | null>(null);
  const [postSubtype, setPostSubtype] = useState<"post" | "musing">("post");

  // Form states: Post & Musing
  const [selectedMuseId, setSelectedMuseId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [behindPost, setBehindPost] = useState("");
  const [location, setLocation] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "photo" | "video" | "voice" | "stream">("photo");

  // Form states: Connection
  const [connectionSeeking, setConnectionSeeking] = useState("");
  const [connectionDetails, setConnectionDetails] = useState("");
  const [connectionSlots, setConnectionSlots] = useState(1);
  const [connectionTags, setConnectionTags] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTopDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    async function loadUserData() {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      if (prof) setProfile(prof);

      const { data: chars } = await supabase
        .from("characters")
        .select("id, name, handle, avatar_url")
        .eq("user_id", currentUser.id)
        .order("name", { ascending: true });

      if (chars) {
        setCast(chars);
        if (chars.length > 0) setSelectedMuseId(chars[0].id);
      }
    }
    loadUserData();
  }, [user]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        characters:character_id ( id, name, handle, avatar_url ),
        profiles:user_id ( username, display_name, avatar_url )
      `)
      .order("created_at", { ascending: false });

    if (data) setPosts(data as Post[]);
  };

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel("nu-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      character_id: selectedMuseId || null,
      post_type: postSubtype,
      content: caption,
      behind_the_post: behindPost || null,
      location: location || null,
      image_urls: mediaUrl ? [mediaUrl] : [],
    };

    const { error } = await supabase.from("posts").insert(payload);
    if (!error) {
      setModalMode(null);
      setCaption("");
      setBehindPost("");
      setLocation("");
      setMediaUrl("");
      loadPosts();
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const tagsArray = connectionTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      user_id: user.id,
      character_id: selectedMuseId || null,
      post_type: "connection",
      content: connectionDetails,
      connection_seeking: connectionSeeking,
      connection_slots: connectionSlots,
      tags: tagsArray,
      image_urls: mediaUrl ? [mediaUrl] : [],
    };

    const { error } = await supabase.from("posts").insert(payload);
    if (!error) {
      setModalMode(null);
      setConnectionSeeking("");
      setConnectionDetails("");
      setConnectionTags("");
      setMediaUrl("");
      loadPosts();
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (activeFilter === "Feed") return true;
    if (activeFilter === "Episodes") return p.post_type === "episode";
    if (activeFilter === "Musings") return p.post_type === "musing";
    if (activeFilter === "Connections") return p.post_type === "connection";
    if (activeFilter === "Events") return p.post_type === "event";
    return true;
  });

  const currentUserDisplay = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const currentUserHandle = profile?.username || user?.email?.split("@")[0] || "user";
  const currentUserAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="w-full bg-white dark:bg-[#0d0e12] rounded-[26px] p-6 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans border border-neutral-200/60 dark:border-neutral-800 min-h-full transition-colors duration-200 shadow-sm">
      {/* 1. TOP BAR */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-neutral-200/70 dark:border-neutral-800/80 mb-6">
        {/* Glossy Pill with Signature Pink Text */}
        <div className="backdrop-blur-md bg-[#f0f2f5]/90 dark:bg-white/10 border border-neutral-300/70 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.06)] rounded-full px-4 py-1.5 flex items-center justify-center">
          <span className="text-[#f45b95] text-xs font-black tracking-wider uppercase drop-shadow-sm">
            THE NU
          </span>
        </div>

        {/* + New Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowTopDropdown(!showTopDropdown)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition border border-neutral-300/60 dark:border-neutral-700/60 shadow-sm"
          >
            <Plus size={14} />
            <span>New</span>
          </button>

          {showTopDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18191f] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden py-1.5 z-30">
              <button
                onClick={() => {
                  setPostSubtype("post");
                  setModalMode("post");
                  setShowTopDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition"
              >
                New post
              </button>
              <button
                onClick={() => {
                  setPostSubtype("musing");
                  setModalMode("post");
                  setShowTopDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition"
              >
                New musing
              </button>
              <button
                onClick={() => {
                  setModalMode("connection");
                  setShowTopDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition"
              >
                New connection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN FEED + FEED SIDEBAR */}
      <div className="w-full flex gap-8">
        {/* Feed Stream */}
        <div className="flex-1 flex flex-col items-center max-w-[480px] mx-auto">
          {/* Stories Bar */}
          <div className="w-full flex items-center gap-4 pb-4">
            <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
              <div className="relative w-14 h-14 rounded-full p-[2px] border-2 border-neutral-200 dark:border-neutral-800 group-hover:border-[#f45b95] transition">
                <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                      {currentUserDisplay.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#f45b95] text-white rounded-full flex items-center justify-center shadow-sm">
                  <Plus size={11} strokeWidth={3} />
                </div>
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Your story</span>
            </div>
          </div>

          {/* Filtering Pills */}
          <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
            {[
              { id: "Feed", label: "Feed" },
              { id: "Episodes", label: "Episodes", icon: Play },
              { id: "Musings", label: "Musings" },
              { id: "Connections", label: "Connections" },
              { id: "Events", label: "Events" },
            ].map((f) => {
              const Icon = f.icon;
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-bold shadow-sm"
                      : "bg-[#f0f2f5] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 dark:bg-[#18191f] dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800"
                  }`}
                >
                  {Icon && <Icon size={11} className={isActive ? "fill-current" : ""} />}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Posts list */}
          <div className="w-full flex flex-col gap-8 mt-2">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 dark:text-neutral-500 text-xs">
                No posts found in this feed.
              </div>
            ) : (
              filteredPosts.map((post) => {
                const authorHandle =
                  post.characters?.handle ||
                  post.characters?.name?.toLowerCase().replace(/\s+/g, "") ||
                  post.profiles?.username ||
                  "user";
                const avatar = post.characters?.avatar_url || post.profiles?.avatar_url;

                return (
                  <article key={post.id} className="w-full flex flex-col bg-transparent">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={authorHandle} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-neutral-700 dark:text-neutral-300">
                              {authorHandle.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white">
                            <span>@{authorHandle}</span>
                            <span className="text-neutral-400 dark:text-neutral-500 font-normal">· 1d</span>
                          </div>
                          {post.location && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
                              <MapPin size={9} />
                              <span>{post.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition">
                        <MoreHorizontal size={15} />
                      </button>
                    </div>

                    {/* Image / Text Body */}
                    {post.image_urls && post.image_urls.length > 0 ? (
                      <div className="relative w-full aspect-[4/5] rounded-[18px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 shadow-sm">
                        <img
                          src={post.image_urls[0]}
                          alt="Post media"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full p-5 rounded-[18px] bg-[#f8f9fb] dark:bg-[#16171d] border border-neutral-200 dark:border-neutral-800 text-sm leading-relaxed shadow-sm">
                        {post.connection_seeking && (
                          <div className="text-xs font-bold text-[#f45b95] mb-2 uppercase tracking-wide">
                            Seeking: {post.connection_seeking}
                          </div>
                        )}
                        <p className="text-neutral-800 dark:text-neutral-200">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mt-3">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 pt-3 pb-1 text-neutral-800 dark:text-white">
                      <button className="hover:text-rose-500 transition">
                        <Heart size={20} />
                      </button>
                      <button className="hover:text-neutral-500 dark:hover:text-neutral-400 transition">
                        <MessageCircle size={20} />
                      </button>
                      <button className="hover:text-neutral-500 dark:hover:text-neutral-400 transition">
                        <Send size={19} />
                      </button>
                    </div>

                    {/* Caption & Comments */}
                    <div className="flex flex-col text-xs gap-1 mt-1">
                      <span className="font-extrabold text-neutral-900 dark:text-white">
                        {post.likes_count || 159} likes
                      </span>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        <span className="font-bold text-neutral-900 dark:text-white mr-1.5">@{authorHandle}</span>
                        {post.content}
                      </p>
                      <button className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium text-left mt-0.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition">
                        View all 7 comments
                      </button>
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1">
                        1D AGO
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col gap-6 shrink-0 pt-2">
          {/* User Profile Card */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shrink-0 flex items-center justify-center">
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {currentUserDisplay.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                {currentUserDisplay}
              </span>
              <span className="text-[11px] text-neutral-400 truncate">
                @{currentUserHandle}
              </span>
            </div>
          </div>

          {/* Your Cast */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">Your cast</span>
              <Link href="/characters" className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition">
                See all
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              {cast.slice(0, 6).map((char) => (
                <div key={char.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-300 dark:border-neutral-700/60 flex items-center justify-center">
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[9px] font-bold text-neutral-700 dark:text-white">
                        {char.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-950 dark:group-hover:text-white transition">
                      {char.handle || char.name.toLowerCase().replace(/\s+/g, ".")}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold mt-0.5">
                      {char.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Something */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Share something</span>
            <button
              onClick={() => {
                setPostSubtype("post");
                setModalMode("post");
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-[#18191f] dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition border border-neutral-300/60 dark:border-neutral-800/80 shadow-sm"
            >
              <ImageIcon size={14} className="text-neutral-500 dark:text-neutral-400" />
              <span>New post</span>
            </button>

            <button
              onClick={() => {
                setPostSubtype("musing");
                setModalMode("post");
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-[#18191f] dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition border border-neutral-300/60 dark:border-neutral-800/80 shadow-sm"
            >
              <PenTool size={14} className="text-neutral-500 dark:text-neutral-400" />
              <span>New musing</span>
            </button>

            <button
              onClick={() => setModalMode("connection")}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-[#18191f] dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition border border-neutral-300/60 dark:border-neutral-800/80 shadow-sm"
            >
              <Link2 size={14} className="text-neutral-500 dark:text-neutral-400" />
              <span>New connection</span>
            </button>
          </div>

          <div className="text-[9px] font-bold tracking-wider text-neutral-400 dark:text-neutral-600 uppercase mt-2">
            THE NU · EVERYTHING IN NUUVI, NEWEST FIRST
          </div>
        </aside>
      </div>

      {/* 3. MODAL: POST / MUSING */}
      {modalMode === "post" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#14151b] border border-neutral-200 dark:border-neutral-800 rounded-[28px] p-6 flex flex-col gap-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">New post</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                POST AS
              </label>
              <select
                value={selectedMuseId}
                onChange={(e) => setSelectedMuseId(e.target.value)}
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-sm font-semibold text-neutral-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
              >
                {cast.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-5 gap-2 bg-[#f0f2f5] dark:bg-[#1b1c24] p-1.5 rounded-2xl border border-neutral-300 dark:border-neutral-800">
              {[
                { id: "text", label: "Text", icon: Type },
                { id: "photo", label: "Photo", icon: ImageIcon },
                { id: "video", label: "Video", icon: Video },
                { id: "voice", label: "Voice note", icon: Mic },
                { id: "stream", label: "Stream", icon: Radio },
              ].map((m) => {
                const Icon = m.icon;
                const active = mediaType === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMediaType(m.id as any)}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-semibold gap-1 transition ${
                      active
                        ? "bg-white dark:bg-neutral-700/60 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <input
              type="url"
              placeholder="Image or media URL..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                WHAT'S HAPPENING?
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Write a caption... @mentions and *formatting* work"
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                BEHIND THE POST (ONLY YOU SEE THIS)
              </label>
              <textarea
                value={behindPost}
                onChange={(e) => setBehindPost(e.target.value)}
                rows={2}
                placeholder="What's going on? e.g. first date at the pier, she's nervous but happy"
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none resize-none"
              />
              <span className="text-[10px] text-neutral-400">
                Fan comments read this so they fit the moment. It's never shown on the post.
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#1e2029] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800">
              <MapPin size={13} className="text-neutral-400" />
              <input
                type="text"
                placeholder="Add a location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#f0f2f5] dark:bg-[#1b1c24] p-1 rounded-2xl border border-neutral-300 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPostSubtype("post")}
                className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  postSubtype === "post"
                    ? "border border-[#f45b95] bg-white dark:bg-transparent text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <ImageIcon size={13} />
                <span>Post</span>
              </button>
              <button
                type="button"
                onClick={() => setPostSubtype("musing")}
                className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  postSubtype === "musing"
                    ? "border border-[#f45b95] bg-white dark:bg-transparent text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                <PenTool size={13} />
                <span>Musing</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={!caption.trim() && !mediaUrl}
                className="px-5 py-2 rounded-full bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 font-bold text-xs transition"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: CONNECTION */}
      {modalMode === "connection" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#14151b] border border-neutral-200 dark:border-neutral-800 rounded-[28px] p-6 flex flex-col gap-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">New connection</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Put out an idea for your muse. Anyone can pick it up for one of theirs; it locks once everyone you need has joined.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                WHICH MUSE IS IT FOR?
              </label>
              <select
                value={selectedMuseId}
                onChange={(e) => setSelectedMuseId(e.target.value)}
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-sm font-semibold text-neutral-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
              >
                {cast.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                WHAT ARE YOU LOOKING FOR?
              </label>
              <input
                type="text"
                value={connectionSeeking}
                onChange={(e) => setConnectionSeeking(e.target.value)}
                placeholder="the ex who still has my hoodie"
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                DETAILS
              </label>
              <textarea
                value={connectionDetails}
                onChange={(e) => setConnectionDetails(e.target.value)}
                rows={3}
                placeholder="History, vibe, what you'd love to write... (formatting works)"
                className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  HOW MANY PEOPLE?
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={connectionSlots}
                  onChange={(e) => setConnectionSlots(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  TAGS
                </label>
                <input
                  type="text"
                  value={connectionTags}
                  onChange={(e) => setConnectionTags(e.target.value)}
                  placeholder="ex, angst, enemies to lovers"
                  className="w-full bg-[#f0f2f5] dark:bg-[#1e2029] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 outline-none"
                />
              </div>
            </div>

            <span className="text-[10px] text-neutral-400">
              More than 1 makes it a group connection (a friend group, a band, a family...).
            </span>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateConnection}
                disabled={!connectionSeeking.trim() || !connectionDetails.trim()}
                className="px-5 py-2 rounded-full bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 font-bold text-xs transition"
              >
                Post connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}