"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

const PRESET_DETAIL_KEYS = [
  "Age",
  "Birthday",
  "Zodiac",
  "Pronouns",
  "Gender",
  "Sexual Orientation",
  "Occupation",
  "Relationship Status",
  "Face claim",
];

const PRESET_PALETTES = [
  ["#f45b95", "#c084fc", "#93c5fd"],
  ["#ec4899", "#a855f7", "#6366f1"],
  ["#818cf8", "#c084fc", "#f472b6"],
  ["#f43f5e", "#fb923c", "#facc15"],
  ["#38bdf8", "#818cf8", "#c084fc"],
  ["#52525b", "#27272a", "#09090b"],
  ["#f97316", "#ef4444", "#dc2626"],
  ["#06b6d4", "#3b82f6", "#6366f1"],
];

interface DetailItem {
  key: string;
  value: string;
}

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated?: () => void;
  defaultIsNpc?: boolean;
}

export default function CreateCharacterModal({
  isOpen,
  onClose,
  onCharacterCreated,
  defaultIsNpc = false,
}: CreateCharacterModalProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  // Color Mode: 1, 2, or 3 colors
  const [colorCount, setColorCount] = useState<1 | 2 | 3>(3);
  const [palette, setPalette] = useState<string[]>(["#f45b95", "#c084fc", "#93c5fd"]);

  // 4 Dedicated Image Slots
  const [avatarUrl, setAvatarUrl] = useState("");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [customThreadUrl, setCustomThreadUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Text Inputs
  const [tagline, setTagline] = useState("");
  const [akaLine, setAkaLine] = useState(""); // Episode tagline
  const [bio, setBio] = useState("");
  const [customFollowers, setCustomFollowers] = useState("");
  const [customFollowing, setCustomFollowing] = useState("");

  // Details (Capped at 10)
  const [details, setDetails] = useState<DetailItem[]>([
    { key: "Age", value: "" },
    { key: "Pronouns", value: "" },
  ]);

  // Status & Badges
  const [isVerified, setIsVerified] = useState(false);
  const [isBrand, setIsBrand] = useState(false);
  const [isNpc, setIsNpc] = useState(defaultIsNpc);
  const [npcCategories, setNpcCategories] = useState("");
  const [npcBehavior, setNpcBehavior] = useState<"manual" | "bot" | "gossip">("manual");

  // Picture Submodal
  const [imageModalTarget, setImageModalTarget] = useState<
    "avatar" | "portrait" | "thread" | "cover" | null
  >(null);
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsNpc(defaultIsNpc);
  }, [defaultIsNpc, isOpen]);

  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data && (data.role === "admin" || data.role === "moderator")) {
        setIsAdmin(true);
      }
    }
    checkRole();
  }, [user]);

  if (!isOpen) return null;

  // Active colors based on selection count
  const activeColors = palette.slice(0, colorCount);
  const isGradient = colorCount > 1;
  const gradientString = isGradient
    ? `linear-gradient(135deg, ${activeColors.join(", ")})`
    : activeColors[0];

  const handleColorUpdate = (index: number, newColor: string) => {
    setPalette((prev) => {
      const next = [...prev];
      next[index] = newColor;
      return next;
    });
  };

  const handleDetailChange = (index: number, field: "key" | "value", text: string) => {
    setDetails((prev) => {
      const copy = [...prev];
      copy[index][field] = text;
      return copy;
    });
  };

  const addDetailRow = (defaultKey = "") => {
    if (details.length >= 10) return;
    setDetails((prev) => [...prev, { key: defaultKey, value: "" }]);
  };

  const removeDetailRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyImage = (url: string) => {
    if (!imageModalTarget) return;
    if (imageModalTarget === "avatar") setAvatarUrl(url);
    if (imageModalTarget === "portrait") setPortraitUrl(url);
    if (imageModalTarget === "thread") setCustomThreadUrl(url);
    if (imageModalTarget === "cover") setCoverUrl(url);
    setImageModalTarget(null);
    setInputUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const ext = file.name.split(".").pop();
      const path = `characters/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      handleApplyImage(data.publicUrl);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Render Episode Tagline preview parsing only **words** into bold colored text
  const renderTaglinePreview = (text: string) => {
    if (!text.trim()) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return (
      <div className="mt-1 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-black/30 border border-neutral-200/50 dark:border-white/5 text-[11px] text-neutral-600 dark:text-neutral-300">
        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mr-2">
          Preview:
        </span>
        {parts.map((part, idx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            const content = part.slice(2, -2);
            return (
              <strong
                key={idx}
                className="font-black"
                style={
                  isGradient
                    ? {
                        backgroundImage: gradientString,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }
                    : { color: activeColors[0] }
                }
              >
                {content}
              </strong>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to create a character.");
      return;
    }
    if (!name.trim()) {
      alert("Character name is required.");
      return;
    }

    

    try {
      setLoading(true);
      const cleanHandle = (handle.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const payload = {
        user_id: user.id, // Explicitly binds to the logged-in writer's Supabase auth UUID
        name: name.trim(),
        handle: cleanHandle,
        color: activeColors[0],
        user_colors: activeColors,
        use_gradient: isGradient,
        avatar_url: avatarUrl || null,
        portrait_url: portraitUrl || null,
        thread_avatar_url: customThreadUrl || null,
        cover_url: coverUrl || null,
        tagline: tagline.trim() || null,
        aka_line: akaLine.trim() || null,
        details: details.slice(0, 10).filter((d) => d.key.trim() || d.value.trim()),
        bio: bio.trim() || null,
        followers_count: customFollowers ? parseInt(customFollowers, 10) : 0,
        following_count: customFollowing ? parseInt(customFollowing, 10) : 0,
        is_verified: isVerified,
        is_brand: isBrand,
        is_npc: isNpc,
        npc_tag: isNpc ? npcCategories.trim() : null,
        npc_behavior: isNpc ? npcBehavior : "manual",
      } 

      const { data, error } = await supabase
        .from("characters")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Character successfully created:", data);

      if (onCharacterCreated) {
        onCharacterCreated();
      }
      onClose();
    } catch (err: unknown) 
      {
      console.error("CREATE CHARACTER ERROR:", err);
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      alert("Error saving character: " + message);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      {/* SEAMLESS SCROLLBAR CONTAINER */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(150,150,150,0.25)_transparent] hover:[scrollbar-color:rgba(150,150,150,0.45)_transparent] bg-white/95 dark:bg-[#13141b]/95 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[28px] p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 text-neutral-900 dark:text-white text-xs">
        
        {/* Compact Header With Enlarged Display Icon */}
        <div className="flex items-center justify-between sticky top-0 bg-transparent z-20 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#f45b95] text-white flex items-center justify-center font-black text-xl sm:text-2xl overflow-hidden shadow-md shrink-0 border-2 border-white/30 dark:border-white/15">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                "?"
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-wider uppercase text-neutral-400">
                New Character
              </span>
              <span className="text-base font-black text-neutral-900 dark:text-white">
                {name || "Untitled"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* 1. COMPACT IMAGE SLOTS WITH HELPER DESCRIPTIONS */}
        <div className="grid grid-cols-2 gap-2 bg-[#f4f6fa] dark:bg-[#181922] p-3 rounded-2xl border border-neutral-200/60 dark:border-white/[0.06]">
          {/* Avatar Icon */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-neutral-700 dark:text-neutral-200">
                Avatar icon
              </span>
              <span className="text-[9px] text-neutral-400 font-medium">
                Social media icon
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => { setImageModalTarget("avatar"); setModalMode("upload"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageModalTarget("avatar"); setModalMode("url"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Link
              </button>
            </div>
          </div>

          {/* Portrait */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-neutral-700 dark:text-neutral-200">
                Portrait
              </span>
              <span className="text-[9px] text-neutral-400 font-medium">
                Directory image
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => { setImageModalTarget("portrait"); setModalMode("upload"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageModalTarget("portrait"); setModalMode("url"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Link
              </button>
            </div>
          </div>

          {/* Thread Icon */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between pr-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase text-neutral-700 dark:text-neutral-200">
                  Thread icon
                </span>
                <span className="text-[9px] text-neutral-400 font-medium">
                  If not set, default to avatar
                </span>
              </div>
              {customThreadUrl && (
                <button
                  type="button"
                  onClick={() => setCustomThreadUrl("")}
                  className="text-[9px] text-[#f45b95] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => { setImageModalTarget("thread"); setModalMode("upload"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageModalTarget("thread"); setModalMode("url"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Link
              </button>
            </div>
          </div>

          {/* Profile Banner */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-neutral-700 dark:text-neutral-200">
                Profile banner
              </span>
              <span className="text-[9px] text-neutral-400 font-medium">
                Social media header
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => { setImageModalTarget("cover"); setModalMode("upload"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageModalTarget("cover"); setModalMode("url"); }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-[10px] font-bold hover:opacity-80 shadow-xs"
              >
                Link
              </button>
            </div>
          </div>
        </div>

        {/* 2. NAME & USERNAME */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-400">NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Chen"
              className="w-full h-8 px-3 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-400">USERNAME</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[11px]">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={name ? name.toLowerCase().replace(/\s+/g, "") : "handle"}
                className="w-full h-8 pl-6 pr-2 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. 1, 2, OR 3 COLOR SELECTION & FORMATTED PREVIEW */}
        <div className="p-3 rounded-2xl bg-[#edf0f5]/80 dark:bg-[#181922] border border-neutral-200/80 dark:border-white/[0.08] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-neutral-400">
              COLOR & PALETTE
            </span>

            {/* 1, 2, or 3 Color Mode Selector */}
            <div className="flex items-center p-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-white/10">
              {([1, 2, 3] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setColorCount(cnt)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition ${
                    colorCount === cnt
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-[#282a36] dark:text-white"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {cnt} {cnt === 1 ? "color" : "colors"}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Preset Swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_PALETTES.map((g, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPalette(g)}
                className="w-5 h-5 rounded-full border border-white/40 shadow-sm transition hover:scale-110"
                style={{
                  background:
                    colorCount === 1
                      ? g[0]
                      : colorCount === 2
                      ? `linear-gradient(135deg, ${g[0]}, ${g[1]})`
                      : `linear-gradient(135deg, ${g[0]}, ${g[1]}, ${g[2]})`,
                }}
              />
            ))}
          </div>

          {/* Individual Color Pickers */}
          <div className="flex items-center gap-2">
            {Array.from({ length: colorCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={palette[i] || "#f45b95"}
                  onChange={(e) => handleColorUpdate(i, e.target.value)}
                  className="w-7 h-6 rounded-md border-none cursor-pointer p-0 bg-transparent"
                />
                <span className="text-[9px] font-mono font-bold uppercase text-neutral-500">
                  {palette[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Live Formatted Text Preview with Gradient on Name and Dialogue */}
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-neutral-200/60 dark:border-white/10 text-xs leading-relaxed">
            <span
              className="font-black uppercase mr-1"
              style={
                isGradient
                  ? {
                      backgroundImage: gradientString,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : { color: activeColors[0] }
              }
            >
              {name ? name.toUpperCase() : "THEIR NAME"}:
            </span>{" "}
            <strong
              style={
                isGradient
                  ? {
                      backgroundImage: gradientString,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : { color: activeColors[0] }
              }
            >
              bold
            </strong>
            ,{" "}
            <em style={{ color: activeColors[colorCount > 1 ? 1 : 0] }}>
              *an action*
            </em>
            ,{" "}
            <span
              className="font-semibold"
              style={
                isGradient
                  ? {
                      backgroundImage: gradientString,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : { color: activeColors[0] }
              }
            >
              &quot;dialogue sweeps through the colors&quot;
            </span>
            ,{" "}
            <span
              className="underline"
              style={{ color: activeColors[colorCount - 1] }}
            >
              _underlined_
            </span>
            .
          </div>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-400">TAGLINE</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A wandering bard with a debt to pay"
            className="w-full h-8 px-3 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
          />
        </div>

        {/* 4. DETAILS SECTION (CAPPED AT 10) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-400">DETAILS</label>
              <span className="text-[9px] font-bold text-neutral-400">({details.length}/10)</span>
            </div>

            {details.length < 10 && (
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#f45b95] hover:opacity-80"
                >
                  <span>Presets</span>
                  <ChevronDown size={10} />
                </button>
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1a1b23] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl py-1 hidden group-hover:flex flex-col z-20">
                  {PRESET_DETAIL_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addDetailRow(k)}
                      className="px-3 py-1 text-left text-[11px] font-semibold hover:bg-neutral-100 dark:hover:bg-white/5"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {details.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Label"
                  value={item.key}
                  onChange={(e) => handleDetailChange(index, "key", e.target.value)}
                  className="w-2/5 h-7 px-2.5 rounded-lg bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-[11px] font-semibold outline-none"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={item.value}
                  onChange={(e) => handleDetailChange(index, "value", e.target.value)}
                  className="flex-1 h-7 px-2.5 rounded-lg bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-[11px] font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeDetailRow(index)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {details.length < 10 && (
            <div>
              <button
                type="button"
                onClick={() => addDetailRow("")}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-[10px] font-bold text-neutral-700 dark:text-neutral-300 hover:opacity-90 mt-0.5"
              >
                <Plus size={10} />
                <span>Add detail</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. EPISODE TAGLINE (FORMERLY AKA LINE - BOLD ONLY) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold uppercase text-neutral-400 leading-tight">
              EPISODE TAGLINE
            </label>
            <span className="text-[9px] text-neutral-400">
              Only bold (**words**) allowed
            </span>
          </div>
          <input
            type="text"
            value={akaLine}
            onChange={(e) => setAkaLine(e.target.value)}
            placeholder="aka **the prodigy**, (he / him) ; twenty8"
            className="w-full h-8 px-3 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
          />
          {renderTaglinePreview(akaLine)}
        </div>

        {/* Followers / Following Counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-400">
              FOLLOWERS SHOWN
            </label>
            <input
              type="text"
              value={customFollowers}
              onChange={(e) => setCustomFollowers(e.target.value)}
              placeholder="real count"
              className="w-full h-8 px-3 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-400">
              FOLLOWING SHOWN
            </label>
            <input
              type="text"
              value={customFollowing}
              onChange={(e) => setCustomFollowing(e.target.value)}
              placeholder="real count"
              className="w-full h-8 px-3 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>
        </div>

        {/* Badges and NPC Handling */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#f45b95] accent-[#f45b95]"
            />
            <span>Verified badge (public figure)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
            <input
              type="checkbox"
              checked={isBrand}
              onChange={(e) => setIsBrand(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#f45b95] accent-[#f45b95]"
            />
            <span>Brand account (shop, cafe, label)</span>
          </label>

          {/* NPC Section */}
          <div
            className={`rounded-xl border transition-all ${
              isNpc
                ? "bg-[#edf0f5]/90 dark:bg-[#181920] border-neutral-300 dark:border-white/15 p-3 flex flex-col gap-2.5"
                : "border-neutral-200 dark:border-white/10 p-2.5"
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
              <input
                type="checkbox"
                checked={isNpc}
                onChange={(e) => setIsNpc(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#f45b95] accent-[#f45b95]"
              />
              <span>This is an NPC (gets badge)</span>
            </label>

            {isNpc && (
              <div className="flex flex-col gap-2 pt-0.5">
                <input
                  type="text"
                  value={npcCategories}
                  onChange={(e) => setNpcCategories(e.target.value)}
                  placeholder="Categories (e.g. staff, foyaen, nightlife)"
                  className="w-full h-8 px-3 rounded-lg bg-white dark:bg-[#121319] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />

                <div className="flex flex-col gap-1.5 text-[11px] font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="npcBehavior"
                      value="manual"
                      checked={npcBehavior === "manual"}
                      onChange={() => setNpcBehavior("manual")}
                      className="accent-[#f45b95]"
                    />
                    <span>I post for them myself</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="npcBehavior"
                      value="bot"
                      checked={npcBehavior === "bot"}
                      onChange={() => setNpcBehavior("bot")}
                      className="accent-[#f45b95]"
                    />
                    <span>They post and comment on their own</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="npcBehavior"
                      value="gossip"
                      disabled={!isAdmin}
                      checked={npcBehavior === "gossip"}
                      onChange={() => setNpcBehavior("gossip")}
                      className="accent-[#f45b95] mt-0.5"
                    />
                    <span className={!isAdmin ? "text-neutral-400" : ""}>
                      Anonymous gossip account {isAdmin ? "" : "(admin only)"}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-400">BIO</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Appearance, personality, history, relationships... (*formatting* works)"
            className="w-full p-2.5 rounded-xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-y"
          />
        </div>

        {/* Sticky Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-1.5 rounded-full bg-[#f45b95] hover:opacity-90 text-white text-xs font-black shadow-md shadow-[#f45b95]/20 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Character"}
          </button>
        </div>
      </div>

      {/* PICTURE SUBMODAL */}
      {imageModalTarget && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white/95 dark:bg-[#14151b]/95 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] uppercase tracking-wider">
                Upload {imageModalTarget}
              </span>
              <button
                type="button"
                onClick={() => setImageModalTarget(null)}
                className="w-6 h-6 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-500"
              >
                <X size={12} />
              </button>
            </div>

            <div className="flex rounded-full bg-[#edf0f5] dark:bg-neutral-800/70 p-0.5 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setModalMode("upload")}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${
                  modalMode === "upload" ? "bg-white dark:bg-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setModalMode("url")}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${
                  modalMode === "url" ? "bg-white dark:bg-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                Image Link
              </button>
            </div>

            {modalMode === "upload" ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-full bg-[#f45b95] text-white text-[11px] font-bold shadow-sm hover:opacity-90"
                >
                  {uploadingImage ? "Uploading..." : "Browse photos"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-8 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 text-xs font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleApplyImage(inputUrl.trim())}
                  className="w-full h-8 rounded-lg bg-[#f45b95] text-white text-[11px] font-bold shadow-sm hover:opacity-90"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}