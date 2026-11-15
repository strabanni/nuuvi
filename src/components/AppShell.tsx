"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import Breadcrumb from "@/components/Breadcrumb";
import { Bagel_Fat_One, Poppins } from "next/font/google";
import {
  Home,
  Inbox,
  Compass,
  Plus,
  Bell,
  Smartphone,
  MessageSquare,
  Users,
  BookOpen,
  ShieldAlert,
  Moon,
  Sun,
  LayoutGrid,
  User,
  Power,
} from "lucide-react";
import PasswordChangeGate from "@/components/PasswordChangeGate";

const bagelFont = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

interface Profile {
  id: string;
  username: string;
  display_name: string;
  user_number?: number;
  avatar_url?: string;
  user_colors?: string[];
  is_verified: boolean;
  role?: "member" | "moderator" | "admin";
}

interface UserStory {
  id: string | number;
  title: string;
  icon?: string | null;
  color?: string | null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("nuuvi_cached_profile");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  
  // Theme control
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Dynamic Post & Character Counts
  const [postsCount, setPostsCount] = useState<number>(0);
  const [charactersCount, setCharactersCount] = useState<number>(0);

  // Online user presence counter
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(1);

  // Real User Stories
  const [userStories, setUserStories] = useState<UserStory[]>([]);

  // Reset password / security gate with failsafe timeout
  const [passwordGate, setPasswordGate] = useState<
    "checking" | "required" | "clear" | "error"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkPasswordGate() {
      if (!user) {
        setPasswordGate("clear");
        return;
      }

      setPasswordGate("checking");

      const timer = setTimeout(() => {
        if (!cancelled) {
          setPasswordGate("clear");
        }
      }, 3000);

      try {
        const { data, error } = await supabase
          .from("account_security")
          .select("must_change_password")
          .eq("user_id", user.id)
          .maybeSingle();

        clearTimeout(timer);
        if (cancelled) return;

        if (error) {
          setPasswordGate("clear");
          return;
        }

        setPasswordGate(data?.must_change_password ? "required" : "clear");
      } catch {
        clearTimeout(timer);
        if (!cancelled) {
          setPasswordGate("clear");
        }
      }
    }

    checkPasswordGate();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real stories the user belongs to or owns
  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    async function loadStories() {
      const { data, error } = await supabase
        .from("story_members")
        .select(`
          story_id,
          stories (
            id,
            title,
            icon,
            color
          )
        `)
        .eq("user_id", currentUser.id);

      if (!error && data) {
        const list = data
          .map((row: any) => row.stories)
          .filter(Boolean) as UserStory[];
        setUserStories(list);
      }
    }

    loadStories();

    // Listen for live story changes
    const storiesChannel = supabase
      .channel("shell-stories-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "story_members",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => loadStories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storiesChannel);
    };
  }, [user]);

  // Fetch profile including user_colors and user_number
  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, user_number, avatar_url, user_colors, is_verified, role")
        .eq("id", currentUser.id)
        .single();

      if (data) setProfile(data);
    }
    loadProfile();

    const profileChannel = supabase
      .channel("shell-profile-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          setProfile((prev) => ({ ...prev, ...(payload.new as Profile) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  // Live Count Fetching & Realtime Listener
  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    async function fetchCounts() {
      const { count: charCount } = await supabase
        .from("characters")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

      setCharactersCount(charCount || 0);
      setPostsCount(postCount || 0);
    }

    fetchCounts();

    const channel = supabase
      .channel("shell-stats-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => fetchCounts()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "characters",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Unread Notifications Count
  const [unreadCount, setUnreadCount] = useState<number>(0);
  // Unread Messages Indicator State
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);

  // Fetch unread notifications
  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    async function fetchUnreadNotifications() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    }

    fetchUnreadNotifications();

    const notifChannel = supabase
      .channel("shell-unread-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  // Fetch unread direct messages status
  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    async function checkUnreadMessages() {
      const { data: convs } = await supabase
        .from("dm_conversations")
        .select("id, user_a, user_b, last_message_at")
        .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`);

      if (convs && convs.length > 0) {
        let unreadFound = false;
        for (const conv of convs) {
          const { data: readData } = await supabase
            .from("dm_reads")
            .select("last_read_at")
            .eq("conversation_id", conv.id)
            .eq("user_id", currentUser.id)
            .maybeSingle();

          const lastRead = readData?.last_read_at ? new Date(readData.last_read_at) : new Date(0);
          const lastMsg = new Date(conv.last_message_at);

          if (lastMsg > lastRead) {
            unreadFound = true;
            break;
          }
        }
        setHasUnreadMessages(unreadFound);
      }
    }

    checkUnreadMessages();

    // Listen for new messages globally to light up the dot instantly
    const msgChannel = supabase
      .channel("shell-unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== currentUser.id) {
            setHasUnreadMessages(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [user]);
  
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#e8eaee] dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  if (passwordGate === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking account…
      </div>
    );
  }

  if (passwordGate === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Could not verify your account status. Please retry.</p>
        <button type="button" onClick={() => setPasswordGate("checking")}>
          Retry
        </button>
      </div>
    );
  }

  if (passwordGate === "required") {
    return <PasswordChangeGate onComplete={() => setPasswordGate("clear")} />;
  }

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const displayHandle = profile?.username || user.email?.split("@")[0] || "user";
  const displayAvatar = profile?.avatar_url || user.user_metadata?.avatar_url;
  const userAccentColor = profile?.user_colors?.[0] || "#8e929b";
  const profileRoute = profile?.user_number ? `/profile/${profile.user_number}` : `/profile/${displayHandle}`;

  return (
    <div className="min-h-screen w-full bg-[#e8eaee] dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 p-4 flex flex-col gap-3 font-sans selection:bg-[#f45b95] selection:text-white transition-colors duration-200">
      {/* 1. TOP HEADER / APP BAR */}
      <header className="w-full bg-white dark:bg-neutral-900 rounded-[24px] shadow-sm border border-neutral-200/50 dark:border-neutral-800 flex flex-col overflow-hidden transition-colors duration-200 shrink-0">
        <div className="w-full px-8 py-1 border-b border-neutral-100 dark:border-neutral-800 flex items-center translate-y-0.5">
          <Breadcrumb />
        </div>

        <div className="w-full px-6 pt-2 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={profileRoute}
              className="w-12 h-12 rounded-[16px] overflow-hidden bg-neutral-900 dark:bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 hover:opacity-90 transition"
              title="View profile"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>

            <div className="flex flex-col gap-0.5">
              <h1 
                className={`${poppins.className} text-[25px] font-semibold tracking-[0.06em] flex items-center gap-2 leading-none scale-y-100 translate-y-1 -translate-x-1 origin-bottom`}
              >
                <span className="text-neutral-900 dark:text-white">WELCOME BACK,</span>
                <Link
                  href={profileRoute}
                  className="uppercase hover:opacity-85 transition-opacity"
                  style={{ color: userAccentColor }}
                >
                  {displayName}
                </Link>
              </h1>
              <p className={`${poppins.className} text-[9px] font-semibold text-neutral-800 dark:text-neutral-300 tracking-wider scale-y-110 uppercase mt-1`}>
                YOU HAVE{" "}
                <span className="text-[#f45b95] font-black">
                  {postsCount} {postsCount === 1 ? "POST" : "POSTS"}
                </span>{" "}
                AND{" "}
                <span className="text-[#f45b95] font-black">
                  {charactersCount} {charactersCount === 1 ? "CHARACTER" : "CHARACTERS"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-neutral-400 dark:text-neutral-500">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title={mounted && resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              href="/nu"
              className={`hover:text-neutral-700 dark:hover:text-neutral-200 transition ${
                pathname.startsWith("/nu") ? "text-[#f45b95]" : ""
              }`}
              title="THE NU"
            >
              <LayoutGrid size={16} />
            </Link>

            <Link
              href="/notifications"
              className={`relative hover:text-neutral-700 dark:hover:text-neutral-200 transition ${
                pathname.startsWith("/notifications") ? "text-[#f45b95]" : ""
              }`}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#f45b95] text-white font-black text-[9px] flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-[0_0_8px_rgba(244,91,149,0.6)] animate-in zoom-in-75 duration-150 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <Link
              href={profileRoute}
              className={`hover:text-neutral-700 dark:hover:text-neutral-200 transition ${
                pathname.startsWith("/profile") ? "text-[#f45b95]" : ""
              }`}
              title="Profile"
            >
              <User size={16} />
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="hover:text-rose-500 transition"
              title="Sign Out"
            >
              <Power size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: SIDEBAR 1 + SIDEBAR 2 + DYNAMIC PAGE CONTENT */}
      <div className="flex-1 flex gap-3 items-stretch min-h-0">
        {/* SIDEBAR 1: DISCORD-STYLE RAIL */}
        <aside className="w-16 bg-white dark:bg-neutral-900 rounded-[26px] py-4 px-2 shadow-sm border border-neutral-200/50 dark:border-neutral-800 flex flex-col items-center justify-between shrink-0 transition-colors duration-200">
          <div className="flex flex-col items-center gap-2.5 w-full">
            <div className="relative group cursor-pointer">
              <div className="w-11 h-11 bg-[#f45b95] rounded-[15px] flex items-center justify-center 
                              shadow-[0_0_10px_rgba(244,91,149,0.5),0_0_120px_rgba(244,91,149,0.3)] 
                              dark:shadow-[0_0_15px_rgba(244,91,149,0.6),0_0_40px_rgba(244,91,149,0.45)]
                              transition-shadow duration-300 hover:shadow-[0_0_25px_rgba(244,91,149,0.7),0_0_50px_rgba(244,91,149,0.55)] 
                              overflow-hidden">
                <img
                  src="/nuuvi-logo.png"
                  alt="nuuvi"
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>

              <span
                className="absolute -top-1 -right-1 bg-emerald-500 text-white font-extrabold text-[9px] min-w-4 h-4 px-1 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center shadow-sm z-10"
                title={`${onlineUsersCount} user${onlineUsersCount === 1 ? "" : "s"} online`}
              >
                {onlineUsersCount}
              </span>
            </div>

            <Link 
              href="/"
              className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition ${
                pathname === "/"
                  ? "bg-[#f0f2f5] dark:bg-neutral-800 text-neutral-800 dark:text-white"
                  : "bg-transparent text-neutral-400 hover:bg-[#f0f2f5] dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
              }`}
              title="Home"
            >
              <Home size={18} />
            </Link>
            <Link 
              href="/archive"
              className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition ${
                pathname === "/archive"
                  ? "bg-[#f0f2f5] dark:bg-neutral-800 text-neutral-800 dark:text-white"
                  : "bg-transparent text-neutral-400 hover:bg-[#f0f2f5] dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
              }`}
              title="Archive"
            >
              <Inbox size={17} />
            </Link>

            <div className="w-7 h-[1.5px] bg-neutral-100 dark:bg-neutral-800 my-0.5" />

            {/* DYNAMIC STORY ICONS: Rendered only when stories exist */}
            {userStories.map((story) => {
              const isActive = pathname.startsWith(`/s/${story.id}`);
              const initial = story.title ? story.title.charAt(0).toUpperCase() : "?";

              return (
                <Link
                  key={story.id}
                  href={`/s/${story.id}`}
                  title={story.title}
                  className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition ${
                    isActive ? "ring-2 ring-[#f45b95]" : "hover:ring-2 hover:ring-[#f45b95]"
                  }`}
                  style={{ backgroundColor: story.color || "#262626" }}
                >
                  {story.icon ? (
                    <img
                      src={story.icon}
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-xs">{initial}</span>
                  )}
                </Link>
              );
            })}

            {/* Add Story Button: Always visible */}
            <Link
              href="/stories/new"
              className="w-9 h-9 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 flex items-center justify-center hover:border-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title="Create a Story"
            >
              <Plus size={16} />
            </Link>
          </div>

          <Link 
            href="/discover" 
            className="w-9 h-9 rounded-full text-neutral-400 flex items-center justify-center hover:text-neutral-700 dark:hover:text-neutral-200 transition"
            title="Discover"
          >
            <Compass size={18} />
          </Link>
        </aside>

        {/* SIDEBAR 2: INNER NAVIGATION LINKS */}
        <aside className="w-56 bg-white dark:bg-neutral-900 rounded-[26px] p-4 shadow-sm border border-neutral-200/50 dark:border-neutral-800 flex flex-col justify-between shrink-0 transition-colors duration-200">
          <div className="flex flex-col gap-4">
            <div className="px-2 pt-1">
              <span className={`${bagelFont.className} text-2xl text-[#f45b95] tracking-wider`}>
                nuuvi
              </span>
            </div>

            <Link
              href={profileRoute}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#f0f2f5] hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 transition group"
              title="View your profile"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <span
                  className="text-[11px] font-bold truncate lowercase transition-colors"
                  style={{ color: userAccentColor }}
                >
                  {displayName}
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 truncate group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition">
                @{displayHandle}
              </span>
            </Link>

            <nav className="flex flex-col gap-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <Link 
                href="/" 
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  pathname === "/"
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Home 
                  size={15} 
                  className={
                    pathname === "/" 
                      ? "text-[#f45b95]" 
                      : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition"
                  } 
                />
                <span>Home</span>
              </Link>

              <Link 
                href="/nu" 
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/nu")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid size={15} className={pathname.startsWith("/nu") ? "text-[#f45b95]" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"} />
                <span>THE NU</span>
              </Link>

              <Link 
                href="/notifications" 
                className={`relative group flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/notifications")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell size={15} className={pathname.startsWith("/notifications") ? "text-[#f45b95]" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#f45b95] shadow-[0_0_8px_rgba(244,91,149,0.7)]" />
                )}
              </Link>

              <Link 
                href="/phone" 
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <Smartphone size={15} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
                <span>Phone</span>
              </Link>

              <Link 
                href="/messages" 
                onClick={() => setHasUnreadMessages(false)}
                className={`relative group flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/messages")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={15} className={pathname.startsWith("/messages") ? "text-[#f45b95]" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"} />
                  <span>Messages</span>
                </div>
                {hasUnreadMessages && (
                  <span className="w-2 h-2 rounded-full bg-[#f45b95] shadow-[0_0_8px_rgba(244,91,149,0.7)]" />
                )}
              </Link>

              {(() => {
                const isDirectoryActive = pathname.startsWith("/directory");

                return (
                  <Link 
                    href="/directory" 
                    className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                      isDirectoryActive
                        ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Users 
                      size={15} 
                      className={`transition-all duration-200 ${
                        isDirectoryActive
                          ? "text-[#f45b95] fill-[#f45b95]/20 stroke-[#f45b95] drop-shadow-[0_0_8px_rgba(244,91,149,0.55)]"
                          : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"
                      }`} 
                    />
                    <span>Directory</span>
                  </Link>
                );
              })()}

              <Link 
                href="/archive" 
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                  pathname === "/archive"
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Inbox size={15} className={pathname === "/archive" ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"} />
                <span>Archive</span>
              </Link>

              <Link 
                href="/lore" 
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <BookOpen size={15} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
                <span>Lore</span>
              </Link>

              <Link 
                href="/discover" 
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <Compass size={15} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
                <span>Discover</span>
              </Link>

              {(profile?.role === "admin" || profile?.role === "moderator") && (() => {
                const isActive = pathname.startsWith("/admin");

                return (
                  <Link
                    href="/admin"
                    className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                      isActive
                        ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <ShieldAlert
                      size={15}
                      className={`transition-all duration-200 ${
                        isActive
                          ? "text-[#f45b95] fill-[#f45b95]/20 stroke-[#f45b95] drop-shadow-[0_0_8px_rgba(244,91,149,0.55)]"
                          : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"
                      }`}
                    />
                    <span>Admin</span>
                  </Link>
                );
              })()}
            </nav>
          </div>

          {/* Bottom "Your Stories" Section: Dynamic */}
          <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between px-2 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
              <span>Your Stories</span>
              <Link href="/stories/new" className="hover:text-neutral-700 dark:hover:text-neutral-200" title="Create Story">
                <Plus size={12} />
              </Link>
            </div>
            
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              {userStories.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-neutral-400 italic">
                  No stories joined yet
                </div>
              ) : (
                userStories.map((story) => (
                  <Link
                    key={story.id}
                    href={`/s/${story.id}`}
                    className="flex items-center gap-2 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition"
                  >
                    <div 
                      className="w-5 h-5 rounded-md text-white flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0"
                      style={{ backgroundColor: story.color || "#262626" }}
                    >
                      {story.icon ? (
                        <img src={story.icon} alt="" className="w-full h-full object-cover" />
                      ) : (
                        story.title.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="truncate text-[11px] font-medium">{story.title}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* 3. CENTER CONTENT CANVAS */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}