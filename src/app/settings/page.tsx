"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Check,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Star,
} from "lucide-react";

// Curated 2-tone smooth gradient presets
const PRESET_GRADIENTS: [string, string][] = [
  ["#f45b95", "#ff8a00"], // Sunset Pink
  ["#ec4899", "#8b5cf6"], // Neon Orchid
  ["#818cf8", "#c084fc"], // Lavender Dream
  ["#38bdf8", "#34d399"], // Mint Cyan
  ["#f43f5e", "#fb7185"], // Rose Glow
  ["#6366f1", "#a855f7"], // Indigo Purple
  ["#0ea5e9", "#6366f1"], // Oceanic
  ["#71717a", "#27272a"], // Obsidian Slate
];

const ACTIVITY_OPTIONS = [
  "Not set",
  "Very active",
  "Moderately active",
  "Low activity",
  "On hiatus",
];

const SEEKING_PLOTS_OPTIONS = [
  "Not set",
  "Accepting plots",
  "Selective",
  "Not accepting",
];

interface WhatsNewData {
  version: string;
  title: string;
  date: string;
  changes: string[];
}

interface WritingStylesMap {
  communication: number;
  one_liners: number;
  rapid_fire: number;
  long_threads: number;
  development: number;
  plotting_first: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // --- 1. APPEARANCE (Device-local states) ---
  const [textSize, setTextSize] = useState<string>("Default");
  const [charNamesMode, setCharNamesMode] = useState<string>("colors");
  const [interfaceSize, setInterfaceSize] = useState<string>("Standard");

  // --- 2. PROFILE STATES ---
  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");

  // Color Engine: starts with 2 swatches by default
  const [customColors, setCustomColors] = useState<string[]>(["#f45b95", "#818cf8"]);

  const [pronouns, setPronouns] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [timeZone, setTimeZone] = useState<string>("");
  const [activity, setActivity] = useState<string>("Not set");
  const [seekingPlots, setSeekingPlots] = useState<string>("Not set");
  const [status, setStatus] = useState<string>("");
  const [aboutMe, setAboutMe] = useState<string>("");
  const [showAbout, setShowAbout] = useState<boolean>(true);

  const [writingStyles, setWritingStyles] = useState<WritingStylesMap>({
    communication: 0,
    one_liners: 0,
    rapid_fire: 0,
    long_threads: 0,
    development: 0,
    plotting_first: 0,
  });

  const [lookingFor, setLookingFor] = useState<string>("");
  const [limits, setLimits] = useState<string>("");

  // --- 3. MODALS ---
  const [imageModalTarget, setImageModalTarget] = useState<"avatar" | "banner" | null>(null);
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System & Modal state
  const [showChangelog, setShowChangelog] = useState<boolean>(false);
  const [changelogData, setChangelogData] = useState<WhatsNewData>({
    version: "MS.NV-00",
    title: "Initial System Baseline",
    date: "October 16, 2026",
    changes: [],
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Safari & Multi-Browser Compliant Auto Theme Sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncThemeWithSystem = (e?: MediaQueryListEvent | MediaQueryList) => {
      const isDark = e ? e.matches : mediaQuery.matches;
      if (theme === "system" || !theme) {
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    // Initial sync
    syncThemeWithSystem();

    // Cross-browser listener (Safari backwards-compatible)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncThemeWithSystem);
      return () => mediaQuery.removeEventListener("change", syncThemeWithSystem);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(syncThemeWithSystem);
      return () => (mediaQuery as any).removeListener(syncThemeWithSystem);
    }
  }, [theme]);

  // Appearance Local Storage Handlers
  const applyTextSize = (size: string) => {
    setTextSize(size);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nuuvi_text_size", size);
      const root = document.documentElement;
      if (size === "Default") root.style.fontSize = "16px";
      if (size === "Large") root.style.fontSize = "17.5px";
      if (size === "Larger") root.style.fontSize = "19px";
    }
  };

  const applyInterfaceSize = (size: string) => {
    setInterfaceSize(size);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nuuvi_interface_size", size);
      const root = document.documentElement;
      const scales: Record<string, string> = {
        Smallest: "0.92",
        Small: "0.96",
        Standard: "1.0",
        Large: "1.04",
        Largest: "1.08",
      };
      root.style.setProperty("zoom", scales[size] || "1.0");
    }
  };

  const applyCharMode = (mode: string) => {
    setCharNamesMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nuuvi_char_mode", mode);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedText = window.localStorage.getItem("nuuvi_text_size");
    if (savedText) applyTextSize(savedText);

    const savedCharMode = window.localStorage.getItem("nuuvi_char_mode");
    if (savedCharMode) setCharNamesMode(savedCharMode);

    const savedUI = window.localStorage.getItem("nuuvi_interface_size");
    if (savedUI) applyInterfaceSize(savedUI);
  }, []);

  // Load User Data & Version
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (prof) {
        setDisplayName(prof.display_name || "");
        setUsername(prof.username || "");
        setAvatarUrl(prof.avatar_url || "");
        setBannerUrl(prof.banner_url || "");
        if (prof.user_colors && Array.isArray(prof.user_colors) && prof.user_colors.length > 0) {
          setCustomColors(prof.user_colors.slice(0, 3));
        }
        setPronouns(prof.pronouns || "");
        setAge(prof.age || "");
        setTimeZone(prof.timezone || "");
        setActivity(prof.activity_level || "Not set");
        setSeekingPlots(prof.seeking_plots || "Not set");
        setStatus(prof.status || "");
        setAboutMe(prof.about_me || "");
        if (typeof prof.show_about === "boolean") setShowAbout(prof.show_about);
        if (prof.writing_styles) setWritingStyles(prof.writing_styles);
        setLookingFor(prof.looking_for || "");
        setLimits(prof.limits || "");
      }
    }

    async function loadVersion() {
      try {
        const res = await fetch("/api/version");
        if (res.ok) {
          const data = await res.json();
          setChangelogData(data);
        }
      } catch (err) {
        console.error("Failed to load version", err);
      }
    }

    loadUserData();
    loadVersion();
  }, [user]);

  // Color Swatch Modifiers
  const updateSwatch = (index: number, hex: string) => {
    const updated = [...customColors];
    updated[index] = hex;
    setCustomColors(updated);
  };

  const addThirdColor = () => {
    if (customColors.length === 2) {
      setCustomColors([...customColors, "#a5b4fc"]);
    }
  };

  const removeThirdColor = () => {
    if (customColors.length === 3) {
      setCustomColors([customColors[0], customColors[1]]);
    }
  };

  // Dynamic CSS Background gradient or color string
  const activeGradientCSS = customColors.length > 1
    ? `linear-gradient(135deg, ${customColors.join(", ")})`
    : customColors[0] || "#f45b95";

  const previewGradientTextStyle = customColors.length > 1
    ? {
        backgroundImage: activeGradientCSS,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }
    : {
        color: customColors[0] || "#f45b95",
      };

// Image Upload Handler (Saves to Storage & directly to User Profile)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !imageModalTarget) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${imageModalTarget}-${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Retrieve public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const generatedUrl = publicUrlData.publicUrl;

      // 3. Immediately persist to database profile
      if (imageModalTarget === "avatar") {
        setAvatarUrl(generatedUrl);
        await supabase
          .from("profiles")
          .update({ avatar_url: generatedUrl })
          .eq("id", user.id);
      } else {
        setBannerUrl(generatedUrl);
        await supabase
          .from("profiles")
          .update({ banner_url: generatedUrl })
          .eq("id", user.id);
      }

      setImageModalTarget(null);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image. Please verify file size or storage permissions.");
    } finally {
      setUploading(false);
    }
  };

  // Image Link Handler (Applies direct URL & updates profile)
  const handleApplyUrl = async () => {
    if (!inputUrl.trim() || !imageModalTarget || !user) return;
    const cleanUrl = inputUrl.trim();

    if (imageModalTarget === "avatar") {
      setAvatarUrl(cleanUrl);
      await supabase
        .from("profiles")
        .update({ avatar_url: cleanUrl })
        .eq("id", user.id);
    } else {
      setBannerUrl(cleanUrl);
      await supabase
        .from("profiles")
        .update({ banner_url: cleanUrl })
        .eq("id", user.id);
    }

    setImageModalTarget(null);
    setInputUrl("");
  };

  // Save Profile Handler with Auto Reload
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setStatusMessage("Saving...");

    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      username: username,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      user_colors: customColors,
      pronouns,
      age,
      timezone: timeZone,
      activity_level: activity,
      seeking_plots: seekingPlots,
      status,
      about_me: aboutMe,
      show_about: showAbout,
      writing_styles: writingStyles,
      looking_for: lookingFor,
      limits,
    }).eq("id", user.id);

    setSaving(false);

    if (!error) {
      setStatusMessage("Saved!");
      router.refresh();
      window.location.reload();
    } else {
      setStatusMessage("Failed to save");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-16">
      {/* TOP HEADER BAR */}
      <div className="w-full flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
          Settings
        </h1>
        <div className="flex items-center gap-3">
          {statusMessage && (
            <span className="text-xs font-semibold text-emerald-500">
              {statusMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#f0f2f5] hover:bg-[#e2e6ee] text-neutral-800 dark:bg-white/15 dark:hover:bg-white/20 dark:text-white border border-neutral-300 dark:border-neutral-700/80 text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Check size={14} />
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: APPEARANCE & DEVICE */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#fcfdfe] dark:bg-[#121318] rounded-[26px] p-6 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-900 dark:text-white">
                APPEARANCE
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">Saved on this device.</p>
            </div>

            {/* 1. Theme Selection */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "system", label: "Auto", bg: "bg-gradient-to-r from-neutral-200 to-neutral-900" },
                { id: "light", label: "Light", bg: "bg-white border border-neutral-200" },
                { id: "dark", label: "Dark", bg: "bg-neutral-950 border border-neutral-800" },
              ].map((t) => {
                const isActive = (theme || "system") === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      if (t.id === "system" && typeof window !== "undefined") {
                        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                        if (isDark) document.documentElement.classList.add("dark");
                        else document.documentElement.classList.remove("dark");
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
                      isActive
                        ? "border-[#f45b95] ring-1 ring-[#f45b95] bg-[#edf0f5]/50 dark:bg-neutral-800/40"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div className={`w-16 h-8 rounded-lg relative overflow-hidden flex items-center justify-center ${t.bg}`}>
                      {t.id !== "system" && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f45b95] absolute top-1.5 right-1.5 shadow-sm" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-2">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 2. Text Size */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                TEXT SIZE
              </label>
              <div className="flex gap-2">
                {["Default", "Large", "Larger"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => applyTextSize(size)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      textSize === size
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                        : "bg-[#edf0f5] dark:bg-[#1c1d24] text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Character Names in Episodes */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                CHARACTER NAMES IN EPISODES
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyCharMode("colors")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    charNamesMode === "colors"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                      : "bg-[#edf0f5] dark:bg-[#1c1d24] text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800"
                  }`}
                >
                  Character Colors
                </button>
                <button
                  type="button"
                  onClick={() => applyCharMode("theme")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    charNamesMode === "theme"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                      : "bg-[#edf0f5] dark:bg-[#1c1d24] text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800"
                  }`}
                >
                  Match My Theme
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Match my theme shows every character&apos;s name in plain black (Light) or white (Dark) instead of their color or gradient.
              </p>
            </div>

            {/* 4. Interface Size */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                INTERFACE SIZE
              </label>
              <div className="flex flex-wrap gap-2">
                {["Smallest", "Small", "Standard", "Large", "Largest"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applyInterfaceSize(s)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                      interfaceSize === s
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                        : "bg-[#edf0f5] dark:bg-[#1c1d24] text-neutral-600 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Makes the whole app smaller or bigger on this device: buttons, text and pictures together.
              </p>
            </div>

            {/* 5. Version Info */}
            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80 flex flex-col gap-1 text-[11px] text-neutral-400">
              <p>Icons: Phosphor (Light).</p>
              <div className="flex items-center gap-1">
                <span>
                  You&apos;re on update{" "}
                  <strong className="text-neutral-700 dark:text-neutral-200 font-bold">
                    {changelogData.version}
                  </strong>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => setShowChangelog(true)}
                  className="text-neutral-700 dark:text-neutral-300 underline font-semibold hover:text-[#f45b95] transition"
                >
                  What&apos;s new?
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="bg-[#fcfdfe] dark:bg-[#121318] rounded-[26px] p-6 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Notifications on this device
            </h2>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Get notified about new posts, @mentions and your turns, even when NUUVI is closed. Notification contents are end-to-end encrypted on their way to your device.
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && "Notification" in window) {
                    Notification.requestPermission();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#edf0f5] dark:bg-[#1e2029] hover:bg-[#e2e6ee] dark:hover:bg-[#282a36] text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300/60 dark:border-neutral-700/60 transition shadow-sm"
              >
                Turn on notifications
              </button>
            </div>
            <p className="text-[10px] text-neutral-400">
              Per-story settings (every post, mentions only, or nothing) are in each story&apos;s menu.
            </p>
          </div>

          {/* Blocked People */}
          <div className="bg-[#fcfdfe] dark:bg-[#121318] rounded-[26px] p-6 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-2">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Blocked people
            </h2>
            <p className="text-[11px] text-neutral-400">
              You haven&apos;t blocked anyone. You can block someone from their profile or from any of their posts.
            </p>
          </div>

          {/* Account */}
          <div className="bg-[#fcfdfe] dark:bg-[#121318] rounded-[26px] p-6 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Account
            </h2>
            <p className="text-[11px] text-neutral-400">
              Signed in as @{username || "user"} (writer).
            </p>
            <div>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/auth");
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#edf0f5] dark:bg-[#1e2029] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold text-rose-600 border border-neutral-300/60 dark:border-neutral-700/60 transition shadow-sm"
              >
                <ChevronLeft size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROFILE & IDENTITY */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#fcfdfe] dark:bg-[#121318] rounded-[26px] p-6 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-5">
            <h2 className="text-sm font-black tracking-wider uppercase text-neutral-900 dark:text-white">
              PROFILE
            </h2>

            {/* Profile Picture & Banner Inputs */}
            <div className="flex items-center gap-4">
              {/* Profile Preview - Squircle / Soft Square */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 shrink-0 flex items-center justify-center shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white uppercase">
                    {(displayName || username || "U").slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Profile picture</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageModalTarget("avatar");
                      setInputUrl(avatarUrl);
                    }}
                    className="px-3.5 py-1 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#1e2029] dark:hover:bg-[#282a36] text-[11px] font-semibold border border-neutral-300/70 dark:border-neutral-700 transition shadow-sm"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Banner</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageModalTarget("banner");
                      setInputUrl(bannerUrl);
                    }}
                    className="px-3.5 py-1 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#1e2029] dark:hover:bg-[#282a36] text-[11px] font-semibold border border-neutral-300/70 dark:border-neutral-700 transition shadow-sm"
                  >
                    Change
                  </button>
                  {bannerUrl && <span className="text-[10px] text-emerald-500 font-semibold">Banner set ✓</span>}
                </div>
                <span className="text-[10px] text-neutral-400">
                  Best sizes: picture 800 × 800 (square) · banner 1800 × 600 (3:1)
                </span>
              </div>
            </div>

            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                DISPLAY NAME
              </label>
              <input
                type="text"
                placeholder="Enter your display name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
              />
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                USERNAME
              </label>
              <div className="flex items-center gap-2 h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4">
                <span className="text-xs text-neutral-400 font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className="w-full bg-transparent text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>
              <span className="text-[10px] text-neutral-400">
                No spaces. You can change it once every 3 hours. Old @mentions keep the old name.
              </span>
            </div>

            {/* YOUR COLORS ENGINE */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                YOUR COLORS
              </label>

              {/* 2-Tone Gradient Presets with Soft Cute Blend */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {PRESET_GRADIENTS.map(([c1, c2], idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomColors([c1, c2])}
                    className="w-8 h-8 rounded-full hover:scale-110 transition-transform shadow-sm relative overflow-hidden border border-white/30 dark:border-neutral-700/60"
                    style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}
                    title={`Gradient preset ${c1} / ${c2}`}
                  />
                ))}
              </div>

              {/* Swatch Boxes with In-Place Color Wheel Positioning */}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {customColors.map((color, index) => (
                  <div
                    key={index}
                    className="relative flex items-center gap-2.5 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-full pl-2 pr-3.5 py-1.5 shadow-sm transition hover:border-neutral-300 dark:hover:border-neutral-700 overflow-hidden cursor-pointer"
                  >
                    {/* Visual Color Dot */}
                    <div
                      className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700 shadow-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />

                    {/* Hex Display */}
                    <span className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 uppercase pointer-events-none">
                      {color}
                    </span>

                    {/* Invisible Full-Overlay Input ensuring popup anchors directly on this button */}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateSwatch(index, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 p-0 border-0"
                      title="Choose color"
                    />
                  </div>
                ))}

                {/* Add / Remove 3rd Color Button */}
                {customColors.length === 2 ? (
                  <button
                    type="button"
                    onClick={addThirdColor}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#191a21] dark:hover:bg-[#252733] border border-neutral-200/80 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition shadow-sm"
                  >
                    <Plus size={14} className="text-[#f45b95]" />
                    <span>3 colors</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={removeThirdColor}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#edf0f5] hover:bg-rose-50 dark:bg-[#191a21] dark:hover:bg-rose-950/20 border border-neutral-200/80 dark:border-neutral-800 text-xs font-bold text-rose-500 transition shadow-sm"
                  >
                    <Trash2 size={13} />
                    <span>Remove 3rd</span>
                  </button>
                )}
              </div>

              {/* COLOR DISPLAY LIVE SHOWCASE */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  COLOR DISPLAY
                </span>
                <div className="w-full bg-[#edf0f5] dark:bg-[#191a21] rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl shadow-md transition-all shrink-0"
                      style={{ background: activeGradientCSS }}
                    />
                    <span
                      className="text-lg font-black tracking-tight transition-all"
                      style={previewGradientTextStyle}
                    >
                      {displayName || username || "evil doki rise"}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-extrabold">
                    PREVIEW
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Your display name and writing-style bars on your profile use these colors.
                </p>
              </div>
            </div>

            {/* Pronouns, Age, Time Zone */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  PRONOUNS
                </label>
                <input
                  type="text"
                  placeholder="e.g. she / her"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  AGE
                </label>
                <input
                  type="text"
                  placeholder="e.g. twenty5"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  TIME ZONE
                </label>
                <input
                  type="text"
                  placeholder="e.g. GMT-5"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Activity & Seeking Plots - Pill Style with Rounded-Full Caps */}
            <div className="grid grid-cols-2 gap-3">
              {/* Activity Pill */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  ACTIVITY
                </label>
                <div className="relative w-full">
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="w-full h-10 appearance-none bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-[15px] px-4 pr-8 text-xs font-semibold text-neutral-900 dark:text-white outline-none cursor-pointer shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                  >
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                  {/* Subtle chevron indicator */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Seeking Plots Pill */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  SEEKING PLOTS
                </label>
                <div className="relative w-full">
                  <select
                    value={seekingPlots}
                    onChange={(e) => setSeekingPlots(e.target.value)}
                    className="w-full h-10 appearance-none bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-[15px] px-4 pr-8 text-xs font-semibold text-neutral-900 dark:text-white outline-none cursor-pointer shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                  >
                    {SEEKING_PLOTS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                  {/* Subtle chevron indicator */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                STATUS
              </label>
              <input
                type="text"
                placeholder="What's on your mind?"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
              />
            </div>

            {/* About You */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  ABOUT YOU
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">Formatting allowed</span>
              </div>
              <textarea
                placeholder="Tell others about yourself..."
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={3}
                className="w-full bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none resize-none"
              />
            </div>

            {/* Show About Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={showAbout}
                onChange={(e) => setShowAbout(e.target.checked)}
                className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95]"
              />
              <span>Show &quot;About&quot; on my profile</span>
            </label>

            {/* WRITING STYLE SLIDERS WITH USER-COLOR BACKGROUND FILL AND STAR DRAG POINT */}
            <div className="flex flex-col gap-4 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                WRITING STYLE
              </label>

              {(
                [
                  { id: "communication", label: "COMMUNICATION" },
                  { id: "one_liners", label: "ONE-LINERS" },
                  { id: "rapid_fire", label: "RAPID FIRE" },
                  { id: "long_threads", label: "LONG THREADS" },
                  { id: "development", label: "DEVELOPMENT" },
                  { id: "plotting_first", label: "PLOTTING FIRST" },
                ] as const
              ).map((slider) => {
                const val = writingStyles[slider.id];
                return (
                  <div key={slider.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                      <span>{slider.label}</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">{val}%</span>
                    </div>

                    {/* Slider track with filled color and star indicator */}
                    <div className="relative w-full h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center">
                      {/* Gradient fill */}
                      <div
                        className="h-full rounded-full transition-[width] duration-75"
                        style={{
                          width: `${val}%`,
                          background: activeGradientCSS,
                        }}
                      />

                    {/* Signature Pink Star Draggable Point */}
                    <div
                        className="absolute flex items-center justify-center pointer-events-none -translate-x-1/2 transition-[left] duration-75 drop-shadow-[0_2px_8px_rgba(244,91,149,0.55)] z-10"
                        style={{ left: `${val}%` }}
                        >
                        <Star
                            size={18}
                            className="text-[#f45b95] fill-[#f45b95] stroke-[#f45b95] dark:stroke-neutral-900 stroke-[1.5]"
                        />
                    </div>

                      {/* Interactive range input */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) =>
                          setWritingStyles({
                            ...writingStyles,
                            [slider.id]: parseInt(e.target.value, 10),
                          })
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Looking For & Limits */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  LOOKING FOR
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">Formatting allowed</span>
              </div>
              <textarea
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                placeholder="Genres, pairings, plot ideas..."
                rows={2}
                className="w-full bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  LIMITS (NOT INTERESTED IN)
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">Formatting allowed</span>
              </div>
              <textarea
                value={limits}
                onChange={(e) => setLimits(e.target.value)}
                placeholder="Hard limits, banned face claims..."
                rows={2}
                className="w-full bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none resize-none"
              />
            </div>

            {/* View Profile Link */}
            <div>
              <Link
                href={`/profile/${username || "user"}`}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-[#edf0f5] dark:bg-[#1e2029] hover:bg-[#e2e6ee] dark:hover:bg-[#282a36] text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300/70 dark:border-neutral-700/70 transition shadow-sm"
              >
                View profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* GLOSSY PILLOW POPUP MODAL FOR PICTURE / BANNER UPLOAD */}
      {imageModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/80 dark:bg-[#14151b]/85 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f45b95]/20 flex items-center justify-center text-[#f45b95]">
                  <ImageIcon size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                  Update {imageModalTarget === "avatar" ? "Profile Picture" : "Banner"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setImageModalTarget(null)}
                className="w-7 h-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Pill Tab Selector */}
            <div className="flex rounded-full bg-[#edf0f5] dark:bg-neutral-800/70 p-1 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setModalMode("upload")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalMode === "upload"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Upload size={13} />
                <span>Upload file</span>
              </button>
              <button
                type="button"
                onClick={() => setModalMode("url")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalMode === "url"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <LinkIcon size={13} />
                <span>Image Link</span>
              </button>
            </div>

            {/* Tab 1: Direct File Upload */}
            {modalMode === "upload" && (
              <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700/80 rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[#f45b95]/15 flex items-center justify-center text-[#f45b95]">
                  <Upload size={20} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {uploading ? "Uploading image..." : "Select an image from device"}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    JPG, PNG, GIF, or WebP up to 10MB
                  </p>
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 rounded-full bg-[#f45b95] text-white text-xs font-bold shadow-md hover:opacity-90 transition disabled:opacity-50 mt-1"
                >
                  {uploading ? "Uploading..." : "Browse photos"}
                </button>
              </div>
            )}

            {/* Tab 2: Web Link input */}
            {modalMode === "url" && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  DIRECT IMAGE URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-10 bg-[#edf0f5] dark:bg-[#191a21] border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="w-full h-10 rounded-xl bg-[#f45b95] text-white text-xs font-bold shadow-md hover:opacity-90 transition"
                >
                  Apply image link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANGELOG POPUP */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14151b] border border-white/10 rounded-[28px] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between">
              <div className="backdrop-blur-md bg-[#f45b95] text-white font-black text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                UPDATE {changelogData.version}
              </div>
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-white">
                {changelogData.title}
              </h2>
              <span className="text-[11px] text-neutral-400">
                {changelogData.date}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
              {changelogData.changes.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-snug">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f45b95] mt-1.5 shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className="px-6 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition border border-neutral-700 shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}