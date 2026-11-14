"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  ChevronDown,
  Trash2,
  Mail,
  Ban,
  Upload,
  Link as LinkIcon,
  X,
  Plus,
} from "lucide-react";

type AdminTab =
  | "Reports"
  | "People"
  | "Invites"
  | "Stories"
  | "Log"
  | "NPCs & bots"
  | "Headers";

interface ManagedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: "member" | "moderator" | "admin";
  created_at: string;
  is_suspended?: boolean;
  posts_count?: number;
}

interface StoryItem {
  id: string;
  title: string;
  owner_name: string;
  is_private: boolean;
  writers_count: number;
  posts_count: number;
  updated_at: string;
}

interface InviteItem {
  id: string;
  code: string;
  for_name: string;
  uses_remaining: number;
  expires_at: string;
  creator_name: string;
}

interface HeaderPic {
  id: string;
  url: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("People");
  const [reportsSubTab, setReportsSubTab] = useState<"Open" | "Resolved" | "Dismissed">("Open");
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<"admin" | "moderator" | null>(null);

  // Global Website Stats
  const [stats, setStats] = useState({ people: 0, stories: 0, posts: 0 });

  // Tab Data
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [storiesList, setStoriesList] = useState<StoryItem[]>([]);
  const [invitesList, setInvitesList] = useState<InviteItem[]>([]);
  const [headersList, setHeadersList] = useState<HeaderPic[]>([]);

  // Invites Form
  const [inviteFor, setInviteFor] = useState("");
  const [inviteUses, setInviteUses] = useState(1);
  const [inviteDays, setInviteDays] = useState(7);

  // Resets for user
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{
    username: string;
    temporaryPassword: string;
  } | null>(null);

  // Automation (NPCs & Bots) Form[cite: 7]
  const [npcActive, setNpcActive] = useState(true);
  const [npcChance, setNpcChance] = useState(35);
  const [npcMaxComments, setNpcMaxComments] = useState(2);
  const [npcPostInterval, setNpcPostInterval] = useState(12);
  const [gossipActive, setGossipActive] = useState(true);

  // Header Image Modal & Upload States
  const [showHeaderModal, setShowHeaderModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initAdmin() {
      if (!user) {
        router.push("/auth");
        return;
      }

      // Check privileges
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!myProfile || (myProfile.role !== "admin" && myProfile.role !== "moderator")) {
        router.push("/");
        return;
      }

      setCurrentRole(myProfile.role);

      // Load Site Counts
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: storyCount } = await supabase.from("stories").select("*", { count: "exact", head: true });
      const { count: postCount } = await supabase.from("posts").select("*", { count: "exact", head: true });

      setStats({
        people: userCount || 0,
        stories: storyCount || 0,
        posts: postCount || 0,
      });

      // Load Users[cite: 4]
      // Load users and their actual post counts
      const { data: profiles, error: profilesError } =
        await supabase.rpc("admin_list_users");

      if (profilesError) {
        console.error("Could not load admin users:", profilesError.message);
      } else if (profiles) {
        setUsersList(profiles as ManagedUser[]);
      }

      // Load Stories[cite: 6]
      const { data: stories } = await supabase
        .from("stories")
        .select("id, title, is_private, updated_at, user_id, profiles(display_name)")
        .order("updated_at", { ascending: false });

      if (stories) {
        setStoriesList(
          stories.map((s: any) => ({
            id: s.id,
            title: s.title || "Untitled story",
            owner_name: s.profiles?.display_name || "Unknown",
            is_private: s.is_private || false,
            writers_count: 1,
            posts_count: 0,
            updated_at: s.updated_at,
          }))
        );
      }

      // Load Invites[cite: 5]
      const { data: invites } = await supabase
        .from("invites")
        .select("id, code, for_name, uses_remaining, expires_at, created_by, profiles(username)")
        .order("created_at", { ascending: false });

      if (invites) {
        setInvitesList(
          invites.map((i: any) => ({
            id: i.id,
            code: i.code,
            for_name: i.for_name,
            uses_remaining: i.uses_remaining,
            expires_at: i.expires_at,
            creator_name: i.profiles?.username || "Admin",
          }))
        );
      }

      // Load Headers
      const { data: headers } = await supabase.from("header_pictures").select("*");
      if (headers) setHeadersList(headers);

      setLoading(false);
    }

    initAdmin();
  }, [user, router]);

  // Promote / Demote Role Handler
  const handleRoleChange = async (targetId: string, newRole: "member" | "moderator" | "admin") => {
    if (currentRole !== "admin") {
      alert("Only admins can adjust privileges.");
      return;
    }

    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", targetId);
    if (!error) {
      setUsersList((prev) => prev.map((u) => (u.id === targetId ? { ...u, role: newRole } : u)));
    }
  };

  // Suspend / Unsuspend Handler
  const handleToggleSuspend = async (targetId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !currentStatus })
      .eq("id", targetId);

    if (!error) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, is_suspended: !currentStatus } : u))
      );
    }
  };

  // Resend / Generate Join Link
  const handleResendLink = (username: string) => {
    const link = `${window.location.origin}/auth?invite=${encodeURIComponent(username)}`;
    navigator.clipboard.writeText(link);
    alert(`Join link for @${username} copied to clipboard!`);
  };

  // Create Invite[cite: 5]
  const handleCreateInvite = async () => {
    if (!inviteFor.trim()) return;
    const code = "E_" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const expiresAt = new Date(Date.now() + inviteDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invites")
      .insert({
        code,
        for_name: inviteFor.trim(),
        uses_remaining: inviteUses,
        expires_at: expiresAt,
        created_by: user?.id,
      })
      .select("id, code, for_name, uses_remaining, expires_at")
      .single();

    if (!error && data) {
      setInvitesList([
        { ...data, creator_name: user?.user_metadata?.username || "Admin" },
        ...invitesList,
      ]);
      setInviteFor("");
    }
  };

  const handleAdminPasswordReset = async (targetId: string) => {
  if (!user || currentRole !== "admin") {
    alert("Only admins can reset passwords.");
    return;
  }

  if (targetId === user.id) {
    alert("Use account settings to change your own password.");
    return;
  }

  if (!confirm("Reset this user's password? They will need to change it after signing in.")) {
    return;
  }

  setResettingUserId(targetId);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Could not verify your session. Please sign in again.");
    }

    const response = await fetch(
      `/api/admin/users/${encodeURIComponent(targetId)}/reset-password`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Password reset failed.");
    }

    setResetResult(result);
  } catch (error) {
    alert(error instanceof Error ? error.message : "Password reset failed.");
  } finally {
    setResettingUserId(null);
  }
};

  // Delete Story (Admin Only)[cite: 6]
  const handleDeleteStory = async (storyId: string) => {
    if (currentRole !== "admin") {
      alert("Only administrators have permission to delete stories.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this story?")) return;

    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    if (!error) {
      setStoriesList((prev) => prev.filter((s) => s.id !== storyId));
      setStats((prev) => ({ ...prev, stories: Math.max(0, prev.stories - 1) }));
    }
  };

  // Upload Header Picture (Storage + DB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const filePath = `headers/header-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { data: inserted, error: insertError } = await supabase
        .from("header_pictures")
        .insert({ url: urlData.publicUrl })
        .select()
        .single();

      if (!insertError && inserted) {
        setHeadersList([...headersList, inserted]);
        setShowHeaderModal(false);
      }
    } catch (err: any) {
      alert("Header upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Apply Direct Image URL[cite: 8]
  const handleApplyUrl = async () => {
    if (!inputUrl.trim()) return;
    try {
      const { data, error } = await supabase
        .from("header_pictures")
        .insert({ url: inputUrl.trim() })
        .select()
        .single();

      if (!error && data) {
        setHeadersList([...headersList, data]);
        setShowHeaderModal(false);
        setInputUrl("");
      }
    } catch (err: any) {
      alert("Failed to save header link: " + err.message);
    }
  };

  // Delete Header Picture[cite: 8]
  const handleDeleteHeader = async (id: string) => {
    const { error } = await supabase.from("header_pictures").delete().eq("id", id);
    if (!error) {
      setHeadersList(headersList.filter((h) => h.id !== id));
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
    <div className="w-full flex flex-col gap-5 font-sans pb-24 text-neutral-900 dark:text-white transition-colors duration-200">
      {/* 1. ADMIN HEADER & LIVE SITE STATS[cite: 3] */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Admin</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {stats.people} people · {stats.stories} stories · {stats.posts} posts
        </p>
      </div>

    {/* 2. GLOSSY PILL NAVIGATION BAR WITH STANDARD CONTRAST */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#f0f2f7] dark:bg-[#1c1d24]/90 backdrop-blur-xl border border-neutral-300/70 dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)] w-fit overflow-x-auto max-w-full">
        {(["Reports", "People", "Invites", "Stories", "Log", "NPCs & bots", "Headers"] as AdminTab[]).map(
          (tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "bg-white text-neutral-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.08)] border border-neutral-200/80 dark:bg-[#282a36] dark:text-white dark:border-white/10 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] font-black scale-[1.02]"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                {tab}
              </button>
            );
          }
        )}
      </div>

      {/* 3. SUB-PILL BAR (Reports Submenu)[cite: 3] */}
      {activeTab === "Reports" && (
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#f0f2f7] dark:bg-[#1c1d24]/90 backdrop-blur-md border border-neutral-300/70 dark:border-white/[0.08] w-fit">
          {(["Open", "Resolved", "Dismissed"] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setReportsSubTab(sub)}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                reportsSubTab === sub
                  ? "bg-white text-[#f45b95] font-black shadow-sm border border-neutral-200 dark:bg-[#282a36] dark:text-[#f45b95] dark:border-white/10"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* 4. TAB CONTENTS */}

      {/* PEOPLE TAB[cite: 4] */}
      {activeTab === "People" && (
        <div className="flex flex-col gap-2.5">
          {usersList.map((u) => {
            const joinedDays = Math.max(
              1,
              Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24))
            );

            return (
              <div
                key={u.id}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-[22px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/15 transition shadow-sm"
              >
                {/* Left: Avatar & Identity Details[cite: 4] */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/15 shrink-0 flex items-center justify-center">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-neutral-900 dark:text-white uppercase">
                        {(u.display_name || u.username).slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {u.display_name || u.username}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">@{u.username}</span>
                      {/* Pill Badge[cite: 4] */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          u.role === "admin"
                            ? "bg-[#f45b95]/10 border-[#f45b95]/30 text-[#f45b95] dark:bg-[#f45b95]/15 dark:border-[#f45b95]/30"
                            : u.role === "moderator"
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                            : "bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-white/10 dark:border-white/10 dark:text-neutral-300"
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.is_suspended && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                          Suspended
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      joined {joinedDays}d ago · {u.posts_count ?? 0} posts
                    </span>
                  </div>
                </div>

                {/* Right: Actions (Resend Link, Change Tier, Suspend)[cite: 4] */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendLink(u.username)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300/80 dark:border-white/10 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 transition"
                    title="Resend join link"
                  >
                    <Mail size={12} className="text-[#f45b95]" />
                    <span>Resend link</span>
                  </button>
                  
                  {/* Reset password*/}
                  {currentRole === "admin" && (
                    <button
                      type="button"
                      disabled={resettingUserId === u.id || u.id === user?.id}
                      onClick={() => handleAdminPasswordReset(u.id)}
                      className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold disabled:opacity-50"
                    >
                      {resettingUserId === u.id ? "Resetting..." : "Reset password"}
                    </button>
                  )}

                  {/* Elevate Privileges Dropdown */}
                  {currentRole === "admin" && (
                    <div className="relative">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as "member" | "moderator" | "admin")
                        }
                        className="appearance-none bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300/80 dark:border-white/10 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 rounded-full px-3 py-1.5 pr-6 outline-none cursor-pointer"
                      >
                        <option value="member" className="bg-white dark:bg-[#1c1d24]">Member</option>
                        <option value="moderator" className="bg-white dark:bg-[#1c1d24]">Moderator</option>
                        <option value="admin" className="bg-white dark:bg-[#1c1d24]">Admin</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                    </div>
                  )}

                  {/* Suspend Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleSuspend(u.id, !!u.is_suspended)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                      u.is_suspended
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                    }`}
                  >
                    <Ban size={11} />
                    <span>{u.is_suspended ? "Unsuspend" : "Suspend"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INVITES TAB[cite: 5] */}
      {activeTab === "Invites" && (
        <div className="flex flex-col gap-4">
          {/* Invite Someone Card[cite: 5] */}
          <div className="p-6 rounded-[26px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Invite someone</h3>
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  WHO IS IT FOR?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sam"
                  value={inviteFor}
                  onChange={(e) => setInviteFor(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="w-24 flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  USES
                </label>
                <input
                  type="number"
                  min="1"
                  value={inviteUses}
                  onChange={(e) => setInviteUses(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="w-32 flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  EXPIRES (DAYS)
                </label>
                <input
                  type="number"
                  min="1"
                  value={inviteDays}
                  onChange={(e) => setInviteDays(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleCreateInvite}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f45b95] hover:opacity-90 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus size={13} />
                <span>Create invite link</span>
              </button>
            </div>
          </div>

          {/* Existing Invites List[cite: 5] */}
          <div className="flex flex-col gap-2">
            {invitesList.map((inv) => (
              <div
                key={inv.id}
                className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.06] flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">{inv.for_name}</span>
                    <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{inv.code}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {inv.uses_remaining} used · expires {new Date(inv.expires_at).toLocaleDateString()} · by {inv.creator_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STORIES TAB (Admin-Only Deletions)[cite: 6] */}
      {activeTab === "Stories" && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Admins can open every writer&apos;s stories. Another admin&apos;s private story stays theirs: unless they add you, you only see that it exists and who owns it. Reported posts show up under Reports.
          </p>

          <div className="flex flex-col gap-2.5">
            {storiesList.map((st) => (
              <div
                key={st.id}
                className="w-full flex items-center justify-between px-5 py-4 rounded-[22px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.06]"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{st.title}</span>
                    <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                      {st.is_private ? "private" : "public"}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    by {st.owner_name} · {st.writers_count} writers · {st.posts_count} posts · updated {new Date(st.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Only Admin can delete[cite: 6] */}
                {currentRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(st.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPCS & BOTS AUTOMATION[cite: 7] */}
      {activeTab === "NPCs & bots" && (
        <div className="flex flex-col gap-4">
          <div className="p-6 rounded-[26px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] flex flex-col gap-5">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Automation</h3>

            {/* Checkbox 1 */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-900 dark:text-white">
              <input
                type="checkbox"
                checked={npcActive}
                onChange={(e) => setNpcActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95]"
              />
              <span>NPCs post and comment on their own</span>
            </label>

            {/* Numerical Inputs[cite: 7] */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  CHANCE AN NPC COMMENTS ON A NEW POST
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={npcChance}
                    onChange={(e) => setNpcChance(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-4 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  MOST NPC COMMENTS PER POST
                </label>
                <input
                  type="number"
                  value={npcMaxComments}
                  onChange={(e) => setNpcMaxComments(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-4 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  EACH NPC POSTS ABOUT EVERY
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={npcPostInterval}
                    onChange={(e) => setNpcPostInterval(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-4 rounded-xl bg-[#f0f2f7] dark:bg-[#1c1d24] border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-900 dark:text-white outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">hours</span>
                </div>
              </div>
            </div>

            {/* Checkbox 2: Gossip Account[cite: 7] */}
            <div className="flex flex-col gap-1 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={gossipActive}
                  onChange={(e) => setGossipActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#f45b95] accent-[#f45b95]"
                />
                <span>The gossip account posts tips when public episodes start or finish</span>
              </label>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pl-6.5">
                Private episodes and private stories are never gossiped about. Comments show up a minute or two after a post, like real people.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => alert("Automation settings saved!")}
                className="px-5 py-2 rounded-full bg-[#f45b95] hover:opacity-90 text-white text-xs font-bold transition shadow-sm"
              >
                Save
              </button>
            </div>
          </div>

          {/* Automatic NPCs Section[cite: 7] */}
          <div className="p-6 rounded-[26px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] flex flex-col gap-2">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Automatic NPCs and gossip accounts</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              None yet. Open any character → Edit → tick <strong>This is an NPC</strong> and choose <strong>They post and comment on their own</strong> (or, for you as admin, <strong>Anonymous gossip account</strong>), then give them lines.
            </p>
          </div>
        </div>
      )}

      {/* HEADERS TAB (Showcase Pictures)[cite: 8] */}
      {activeTab === "Headers" && (
        <div className="flex flex-col gap-5 p-6 rounded-[28px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Header pictures</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              They crossfade every 8 seconds at the top of Home, Feed, Events, Directory, Characters and Notifications. With none, the pink-lilac gradient shows. Wide pictures work best (about 1800 × 600).
            </p>
          </div>

          {/* Squircle Showcase Grid[cite: 8] */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {headersList.map((header) => (
              <div
                key={header.id}
                className="group relative h-20 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 shadow-sm"
              >
                <img src={header.url} alt="Header" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeleteHeader(header.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                  title="Remove header"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Upload and Link Buttons Styled with Settings Pill Aesthetic[cite: 8] */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalMode("upload");
                setShowHeaderModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#f45b95] hover:opacity-90 text-white text-xs font-bold shadow-[0_2px_10px_rgba(244,91,149,0.35)] transition"
            >
              <Upload size={13} />
              <span>Upload pictures</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode("url");
                setShowHeaderModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#edf0f5] hover:bg-[#e2e6ee] dark:bg-[#1e2029] dark:hover:bg-[#282a36] text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300/70 dark:border-neutral-700/70 transition shadow-sm"
            >
              <LinkIcon size={13} />
              <span>Add a picture link</span>
            </button>
          </div>
        </div>
      )}

      {/* REPORTS / LOG PLACEHOLDER[cite: 3] */}
      {(activeTab === "Reports" || activeTab === "Log") && (
        <div className="w-full p-12 rounded-[26px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] text-center text-xs text-neutral-500 dark:text-neutral-400 font-bold">
          No {activeTab.toLowerCase()} to display.
        </div>
      )}

      {/* GLOSSY PILLOW POPUP MODAL FOR HEADER PICTURES (Settings Exact Match) */}
      {showHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/80 dark:bg-[#14151b]/85 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f45b95]/20 flex items-center justify-center text-[#f45b95]">
                  <Upload size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                  Add Header Picture
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderModal(false);
                  setInputUrl("");
                }}
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
      {resetResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-[#16171f]">
            <h2 id="reset-password-title" className="text-lg font-bold">
              Temporary password created
            </h2>

            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Give this password to @{resetResult.username} privately. It will be
              shown here only once.
            </p>

            <input
              readOnly
              value={resetResult.temporaryPassword}
              className="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
              onFocus={(event) => event.currentTarget.select()}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetResult.temporaryPassword);
                    alert("Temporary password copied.");
                  } catch {
                    alert("Copy failed. Select the password and copy it manually.");
                  }
                }}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-neutral-200 dark:text-neutral-900"
              >
                Copy password
              </button>

              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="rounded-full bg-neutral-200 px-4 py-2 text-sm font-bold dark:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}