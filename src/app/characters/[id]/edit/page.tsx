"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  ChevronDown,
  Check,
  RotateCcw,
  Trash2,
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

const PRESET_GRADIENTS = [
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

export default function EditCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params?.id as string;
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Character Basics
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [color, setColor] = useState("#f45b95");
  const [useGradient, setUseGradient] = useState(true);
  const [gradientColors, setGradientColors] = useState<string[]>([
    "#f45b95",
    "#c084fc",
    "#93c5fd",
  ]);

  // 4 Image Types
  const [avatarUrl, setAvatarUrl] = useState("");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [customThreadUrl, setCustomThreadUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Texts
  const [tagline, setTagline] = useState("");
  const [akaLine, setAkaLine] = useState("");
  const [bio, setBio] = useState("");
  const [customFollowers, setCustomFollowers] = useState("");
  const [customFollowing, setCustomFollowing] = useState("");

  // Details
  const [details, setDetails] = useState<DetailItem[]>([]);

  // Flags & Badges
  const [isVerified, setIsVerified] = useState(false);
  const [isBrand, setIsBrand] = useState(false);
  const [isNpc, setIsNpc] = useState(false);
  const [npcCategories, setNpcCategories] = useState("");
  const [npcBehavior, setNpcBehavior] = useState<"manual" | "bot" | "gossip">("manual");

  // Picture Upload Modal State
  const [imageModalTarget, setImageModalTarget] = useState<
    "avatar" | "portrait" | "thread" | "cover" | null
  >(null);
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCharacterAndRole() {
      if (!user || !characterId) return;

      try {
        setLoading(true);

        // Check user role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileData && (profileData.role === "admin" || profileData.role === "moderator")) {
          setIsAdmin(true);
        }

        // Fetch character
        const { data: charData, error } = await supabase
          .from("characters")
          .select("*")
          .eq("id", characterId)
          .single();

        if (error || !charData) {
          throw new Error("Character not found.");
        }

        // Populate state
        setName(charData.name || "");
        setHandle(charData.handle || "");
        setColor(charData.color || "#f45b95");
        
        if (charData.user_colors && charData.user_colors.length > 1) {
          setUseGradient(true);
          setGradientColors(charData.user_colors);
        } else {
          setUseGradient(false);
          if (charData.user_colors?.[0]) setColor(charData.user_colors[0]);
        }

        setAvatarUrl(charData.avatar_url || "");
        setPortraitUrl(charData.portrait_url || "");
        setCustomThreadUrl(charData.thread_avatar_url || "");
        setCoverUrl(charData.cover_url || "");
        setTagline(charData.tagline || "");
        setAkaLine(charData.aka_line || "");
        setBio(charData.bio || "");
        setCustomFollowing(
          charData.following_count != null ? String(charData.following_count) : ""
        );
        setDetails(charData.details || []);
        setIsVerified(charData.is_verified || false);
        setIsBrand(charData.is_brand || false);
        setIsNpc(charData.is_npc || false);
        setNpcCategories(charData.npc_tag || "");
        setNpcBehavior(charData.npc_behavior || "manual");

      } catch (err: any) {
        alert("Could not load character: " + err.message);
        router.push("/directory");
      } finally {
        setLoading(false);
      }
    }

    loadCharacterAndRole();
  }, [user, characterId, router]);

  // Details Handlers (10 Limit)
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

  // Image Upload Handlers
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      alert("Character name is required.");
      return;
    }

    try {
      setSaving(true);
      const cleanHandle = (handle.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const { error } = await supabase
        .from("characters")
        .update({
          name: name.trim(),
          handle: cleanHandle,
          color,
          user_colors: useGradient ? gradientColors : [color],
          avatar_url: avatarUrl || null,
          portrait_url: portraitUrl || null,
          thread_avatar_url: customThreadUrl || null,
          cover_url: coverUrl || null,
          tagline: tagline.trim() || null,
          aka_line: akaLine.trim() || null,
          details: details
            .slice(0, 10)
            .filter((d) => d.key.trim() || d.value.trim()),
          bio: bio.trim() || null,
          followers_count: customFollowers.trim()
            ? Number.parseInt(customFollowers, 10)
            : 0,
          following_count: customFollowing.trim()
            ? Number.parseInt(customFollowing, 10)
            : 0,
          is_verified: isVerified,
          is_brand: isBrand,
          is_npc: isNpc,
          npc_tag: isNpc ? npcCategories.trim() : null,
          npc_behavior: isNpc ? npcBehavior : "manual",
        })
        .eq("id", characterId);

      if (error) throw error;
      router.push(`/phone/${cleanHandle}`);
    } catch (err: any) {
      alert("Error updating character: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this character? This cannot be undone.")) return;

    try {
      const { error } = await supabase.from("characters").delete().eq("id", characterId);
      if (error) throw error;
      router.push("/directory");
    } catch (err: any) {
      alert("Could not delete character: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 font-sans text-neutral-900 dark:text-white transition-colors duration-200">
      <div className="bg-white dark:bg-[#14151b] border border-neutral-200/80 dark:border-white/[0.08] rounded-[36px] p-6 sm:p-9 shadow-xl flex flex-col gap-7">
        
        {/* Header Title & Delete Button */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-neutral-400">edit character</span>
            <h1 className="text-2xl font-black tracking-tight">Update {name || "Character"}</h1>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>

        {/* 1. FOUR IMAGE CONFIGURATIONS */}
        <div className="flex flex-col gap-4">
          <div className="w-20 h-20 rounded-full bg-[#f45b95] text-white flex items-center justify-center font-black text-2xl overflow-hidden shadow-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              "?"
            )}
          </div>

          {/* Slot 1: Avatar Icon */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mr-1">
              Avatar icon (social media)
            </span>
            <button
              type="button"
              onClick={() => {
                setImageModalTarget("avatar");
                setModalMode("upload");
              }}
              className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setImageModalTarget("avatar");
                setModalMode("url");
              }}
              className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
            >
              Link
            </button>
          </div>

          {/* Slot 2: Portrait */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Portrait (directory card)
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("portrait");
                  setModalMode("upload");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("portrait");
                  setModalMode("url");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Link
              </button>
            </div>
            <p className="text-[10px] text-neutral-400">
              Shown large on their character card. Recommended size: 1200 × 1500 (4:5)
            </p>
          </div>

          {/* Slot 3: Thread Icon */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Thread icon
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("thread");
                  setModalMode("upload");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("thread");
                  setModalMode("url");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Link
              </button>
              {customThreadUrl && (
                <button
                  type="button"
                  onClick={() => setCustomThreadUrl("")}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-200 transition"
                >
                  <RotateCcw size={10} />
                  <span>Reset to default</span>
                </button>
              )}
            </div>
          </div>

          {/* Slot 4: Banner */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Profile banner
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("cover");
                  setModalMode("upload");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageModalTarget("cover");
                  setModalMode("url");
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold transition"
              >
                Link
              </button>
            </div>
          </div>
        </div>

        {/* 2. NAME, USERNAME, COLOR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              USERNAME
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full h-11 pl-8 pr-3 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              COLOR
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-11 h-11 rounded-2xl border-none cursor-pointer p-0 bg-transparent"
              />
              <span className="text-xs font-mono font-bold uppercase">{color}</span>
            </div>
          </div>
        </div>

        {/* 3. COLOR GRADIENT */}
        <div className="p-5 rounded-[26px] bg-[#f0f2f7]/80 dark:bg-[#191a22] border border-neutral-200/80 dark:border-white/[0.08] flex flex-col gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={useGradient}
              onChange={(e) => setUseGradient(e.target.checked)}
              className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95]"
            />
            <span>Use a gradient instead</span>
          </label>

          {useGradient && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGradientColors(g)}
                    className="w-8 h-8 rounded-full border border-white/40 shadow-sm transition hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${g[0]}, ${g[1]}, ${g[2]})`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {gradientColors.map((c, i) => (
                    <input
                      key={i}
                      type="color"
                      value={c}
                      onChange={(e) => {
                        const next = [...gradientColors];
                        next[i] = e.target.value;
                        setGradientColors(next);
                      }}
                      className="w-9 h-7 rounded-lg border-none cursor-pointer p-0 bg-transparent"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
            TAGLINE
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
          />
        </div>

        {/* 4. DETAILS SECTION */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                DETAILS
              </label>
              <span className="text-[10px] font-bold text-neutral-400">
                ({details.length} / 10)
              </span>
            </div>

            {details.length < 10 && (
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] font-bold text-[#f45b95] hover:opacity-80 transition"
                >
                  <span>Add Preset</span>
                  <ChevronDown size={12} />
                </button>
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a1b23] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-xl py-1.5 hidden group-hover:flex flex-col z-20">
                  {PRESET_DETAIL_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addDetailRow(k)}
                      className="px-3.5 py-1.5 text-left text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {details.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => handleDetailChange(index, "key", e.target.value)}
                  className="w-1/2 h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleDetailChange(index, "value", e.target.value)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeDetailRow(index)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {details.length < 10 && (
            <div>
              <button
                type="button"
                onClick={() => addDetailRow("")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:opacity-90 transition mt-1"
              >
                <Plus size={13} />
                <span>Add detail</span>
              </button>
            </div>
          )}
        </div>

        {/* AKA Line */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 leading-tight">
            AKA LINE
          </label>
          <input
            type="text"
            value={akaLine}
            onChange={(e) => setAkaLine(e.target.value)}
            className="w-full h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
          />
        </div>

        {/* Followers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              FOLLOWERS SHOWN
            </label>
            <input
              type="text"
              value={customFollowers}
              onChange={(e) => setCustomFollowers(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              FOLLOWING SHOWN
            </label>
            <input
              type="number"
              min="0"
              value={customFollowing}
              onChange={(e) => setCustomFollowing(e.target.value)}
              placeholder="real count"
              className="w-full h-11 px-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
            />
          </div>
        </div>

        {/* Badges & NPC */}
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95] mt-0.5"
            />
            <span>Verified badge</span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={isBrand}
              onChange={(e) => setIsBrand(e.target.checked)}
              className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95] mt-0.5"
            />
            <span>This is a brand account</span>
          </label>

          <div
            className={`rounded-[26px] border transition-all duration-200 ${
              isNpc
                ? "bg-[#f0f2f7]/80 dark:bg-[#181920] border-neutral-300 dark:border-white/15 p-5 flex flex-col gap-4"
                : "border-neutral-200 dark:border-white/10 p-4"
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={isNpc}
                onChange={(e) => setIsNpc(e.target.checked)}
                className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95]"
              />
              <span>This is an NPC</span>
            </label>

            {isNpc && (
              <div className="flex flex-col gap-4 pt-1">
                <input
                  type="text"
                  value={npcCategories}
                  onChange={(e) => setNpcCategories(e.target.value)}
                  placeholder="Categories (comma separated)"
                  className="w-full h-11 px-4 rounded-2xl bg-white dark:bg-[#121319] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
            BIO
          </label>
          <textarea
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-4 rounded-2xl bg-[#edf0f5] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleUpdate}
            className="px-8 py-3 rounded-full bg-[#f45b95] hover:opacity-90 text-white text-xs font-black shadow-lg shadow-[#f45b95]/25 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* IMAGE MODAL */}
      {imageModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/90 dark:bg-[#14151b]/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wider">
                Upload {imageModalTarget}
              </span>
              <button
                type="button"
                onClick={() => setImageModalTarget(null)}
                className="w-7 h-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex rounded-full bg-[#edf0f5] dark:bg-neutral-800/70 p-1 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setModalMode("upload")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
                  modalMode === "upload"
                    ? "bg-white dark:bg-neutral-900 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setModalMode("url")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
                  modalMode === "url"
                    ? "bg-white dark:bg-neutral-900 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                Image Link
              </button>
            </div>

            {modalMode === "upload" ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
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
                  className="px-5 py-2 rounded-full bg-[#f45b95] text-white text-xs font-bold shadow-md hover:opacity-90"
                >
                  {uploadingImage ? "Uploading..." : "Browse photos"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="url"
                  placeholder="https://..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleApplyImage(inputUrl.trim())}
                  className="w-full h-10 rounded-xl bg-[#f45b95] text-white text-xs font-bold shadow-md hover:opacity-90"
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