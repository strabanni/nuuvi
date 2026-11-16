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
  Menu,
  X,
  FileText
} from "lucide-react";
import PasswordChangeGate from "@/components/PasswordChangeGate";
import CreateStoryModal from "@/components/CreateStoryModal";

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
  
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Second bar toggle state (starts closed, opens strictly on click)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [postsCount, setPostsCount] = useState<number>(0);
  const [charactersCount, setCharactersCount] = useState<number>(0);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(1);
  const [userStories, setUserStories] = useState<UserStory[]>([]);

  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Inside AppShell.tsx
  const WELCOME_PHRASES = [
    "WELCOME BACK",
    "LOOK AT THE RECENT HEADLINES",
    "YOUR CHARACTERS MISSED YOU",
    "TIME TO WRITE",
  ];

  const [welcomePhrase, setWelcomePhrase] = useState("WELCOME BACK");

useEffect(() => {
  const randomPhrase = WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)];
  setWelcomePhrase(randomPhrase);
}, []);
  
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
          .eq("user_id", user?.id)
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

  // Inside your global AppShell or Navbar component:
  useEffect(() => {
    if (!user?.id) return;

    async function checkUnread() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);
        
      // Set your unread badge state here (e.g., setHasUnreadNotifications((count ?? 0) > 0))
    }

    checkUnread();

    // Global realtime listener for the bell icon
    const globalChannel = supabase
      .channel(`global-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Trigger your unread badge state to turn on / show pink dot!
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user?.id]);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);

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
    <div className="min-h-screen w-full bg-[#e8eaee] dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 p-3 sm:p-4 flex flex-col gap-3 font-sans selection:bg-[#f45b95] selection:text-white transition-colors duration-200">
      
      {/* 1. TOP HEADER / APP BAR */}
      <header className="w-full bg-white dark:bg-neutral-900 rounded-[28px] shadow-sm border border-neutral-200/50 dark:border-neutral-800 flex flex-col overflow-hidden transition-colors duration-200 shrink-0">
        <div className="w-full px-6 sm:px-8 py-1.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center translate-y-0.5">
          <Breadcrumb />
        </div>

        <div className="w-full px-6 sm:px-8 pt-4 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href={profileRoute}
              className="w-16 h-16 rounded-[20px] overflow-hidden bg-neutral-900 dark:bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 hover:opacity-90 transition shadow-sm"
              title="View profile"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 text-white flex items-center justify-center font-bold text-base tracking-wider">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>

            <div className="flex flex-col gap-1">
              <h1 
                className={`${poppins.className} text-2xl sm:text-[32px] font-semibold tracking-[0.06em] flex items-center gap-2.5 leading-none scale-y-100 translate-y-1 -translate-x-1 origin-bottom`}
              >
                <span className="text-neutral-900 dark:text-white">WELCOME BACK,</span>
                <Link
                  href={profileRoute}
                  className="uppercase hover:opacity-85 transition-opacity text-[#f45b95]"
                >
                  {displayName}
                </Link>
              </h1>
              <p className={`${poppins.className} text-[11px] font-semibold text-neutral-800 dark:text-neutral-300 tracking-wider scale-y-110 uppercase mt-1.5`}>
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

          {/* Top header icons with increased spacing (gap-8 / gap-10) */}
          <div className="hidden lg:flex items-center gap-8 text-neutral-400 dark:text-neutral-500">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title={mounted && resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {mounted && resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href="/nu"
              className={`hover:text-neutral-700 dark:hover:text-neutral-200 transition ${
                pathname.startsWith("/nu") ? "text-[#f45b95]" : ""
              }`}
              title="THE NU"
            >
              <LayoutGrid size={18} />
            </Link>

            <Link
              href="/notifications"
              className={`relative hover:text-neutral-700 dark:hover:text-neutral-200 transition ${
                pathname.startsWith("/notifications") ? "text-[#f45b95]" : ""
              }`}
              title="Notifications"
            >
              <Bell size={18} />
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
              <User size={18} />
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="hover:text-rose-500 transition"
              title="Sign Out"
            >
              <Power size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: SIDEBAR 1 + TOGGLEABLE SIDEBAR 2 DRAWER + CONTENT */}
      <div className="flex-1 flex gap-3 items-stretch min-h-0 relative">
        
        {/* SIDEBAR 1: RAIL WITH ONLINE INDICATOR BUBBLE & MENU TOGGLE */}
        <aside className="w-16 bg-white dark:bg-neutral-900 rounded-[26px] py-4 px-2 shadow-sm border border-neutral-200/50 dark:border-neutral-800 flex flex-col items-center justify-between shrink-0 transition-colors duration-200 z-30">
          
          <div className="flex flex-col items-center gap-2.5 w-full">
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="w-11 h-11 bg-[#f45b95] rounded-[15px] flex items-center justify-center 
                              shadow-[0_0_10px_rgba(244,91,149,0.5)] 
                              transition-shadow duration-300 overflow-hidden">
                <img
                  src="/nuuvi-logo.png"
                  alt="nuuvi"
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>

              {/* Small bubble underneath with pink indicator circle and online count */}
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-neutral-700 dark:text-neutral-300 shadow-sm mt-1.5"
                title={`${onlineUsersCount} user online`}
              >
                <span className="w-2 h-2 rounded-full bg-[#f45b95] animate-pulse" />
                <span>{onlineUsersCount}</span>
              </div>
            </div>

            {/* HAMBURGER MENU TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 rounded-[14px] bg-[#f0f2f5] dark:bg-neutral-800 text-neutral-800 dark:text-white flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              title="Open Navigation Menu"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

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

            {/* DYNAMIC STORY ICONS */}
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

            <button
              type="button"
              onClick={() => setIsCreateStoryOpen(true)}
              className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-[#f45b95] text-neutral-400 hover:text-white flex items-center justify-center transition shadow-md"
              title="Start a story"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* BOTTOM SECTION: Header Banner Icons */}
          <div className="flex flex-col items-center gap-3 w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title="Toggle Theme"
            >
              {mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              href="/nu"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title="THE NU"
            >
              <LayoutGrid size={16} />
            </Link>

            <Link
              href="/notifications"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#f45b95] text-white font-black text-[8px] flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <Link
              href={profileRoute}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
              title="Profile"
            >
              <User size={16} />
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:text-rose-500 transition"
              title="Sign Out"
            >
              <Power size={16} />
            </button>

            <Link
              href={profileRoute}
              className="w-9 h-9 rounded-full bg-[#f45b95] text-white font-black text-xs flex items-center justify-center overflow-hidden shadow-sm mt-1"
              title={displayName}
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </Link>
          </div>
        </aside>

        {/* SIDEBAR 2: TOGGLEABLE OVERLAY DRAWER (Hides completely off to the left when closed) */}
        <aside 
          className={`absolute z-40 top-0 left-16 h-full w-56 bg-white dark:bg-neutral-900 rounded-[26px] p-4 shadow-2xl border border-neutral-200/50 dark:border-neutral-800 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-[130%] opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="px-2 pt-1 flex items-center justify-between">
              <span className={`${bagelFont.className} text-2xl text-[#f45b95] tracking-wider`}>
                nuuvi
              </span>
              <button 
                type="button" 
                onClick={() => setIsSidebarOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <Link
              href={profileRoute}
              onClick={() => setIsSidebarOpen(false)}
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
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  pathname === "/"
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Home size={15} className={pathname === "/" ? "text-[#f45b95]" : "text-neutral-400"} />
                <span>Home</span>
              </Link>

              <Link 
                href="/nu" 
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/nu")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid size={15} className={pathname.startsWith("/nu") ? "text-[#f45b95]" : "text-neutral-400"} />
                <span>THE NU</span>
              </Link>

              <Link 
                href="/notifications" 
                onClick={() => setIsSidebarOpen(false)}
                className={`relative group flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/notifications")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell size={15} className={pathname.startsWith("/notifications") ? "text-[#f45b95]" : "text-neutral-400"} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-[#f45b95]" />}
              </Link>

              <Link 
                href="/phone" 
                onClick={() => setIsSidebarOpen(false)}
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <Smartphone size={15} className="text-neutral-400" />
                <span>Phone</span>
              </Link>

              <Link 
                href="/messages" 
                onClick={() => { setHasUnreadMessages(false); setIsSidebarOpen(false); }}
                className={`relative group flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/messages")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={15} className={pathname.startsWith("/messages") ? "text-[#f45b95]" : "text-neutral-400"} />
                  <span>Messages</span>
                </div>
                {hasUnreadMessages && <span className="w-2 h-2 rounded-full bg-[#f45b95]" />}
              </Link>

              <Link 
                href="/directory" 
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/directory")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Users size={15} className={pathname.startsWith("/directory") ? "text-[#f45b95]" : "text-neutral-400"} />
                <span>Directory</span>
              </Link>

              <Link 
                href="/drafts" 
                className={`relative group flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  pathname.startsWith("/drafts")
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className={pathname.startsWith("/drafts") ? "text-[#f45b95]" : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"} />
                  <span>Drafts</span>
                </div>
              </Link>

              <Link 
                href="/archive" 
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                  pathname === "/archive"
                    ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Inbox size={15} className="text-neutral-400" />
                <span>Archive</span>
              </Link>

              <Link 
                href="/lore" 
                onClick={() => setIsSidebarOpen(false)}
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <BookOpen size={15} className="text-neutral-400" />
                <span>Lore</span>
              </Link>

              <Link 
                href="/discover" 
                onClick={() => setIsSidebarOpen(false)}
                className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition"
              >
                <Compass size={15} className="text-neutral-400" />
                <span>Discover</span>
              </Link>

              {(profile?.role === "admin" || profile?.role === "moderator") && (
                <Link
                  href="/admin"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition ${
                    pathname.startsWith("/admin")
                      ? "bg-neutral-400/20 text-neutral-900 dark:text-white font-bold"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <ShieldAlert size={15} className={pathname.startsWith("/admin") ? "text-[#f45b95]" : "text-neutral-400"} />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between px-2 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
              <span>Your Stories</span>
              <Link href="/stories/new" onClick={() => setIsSidebarOpen(false)} title="Create Story">
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
                    onClick={() => setIsSidebarOpen(false)}
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