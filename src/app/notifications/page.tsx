"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import ShowcaseHeroBanner from "@/components/ShowcaseHeroBanner";
import { Bell, CheckCheck, Trash2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  content?: string;
  avatar_url?: string;
  actor_name?: string;
  link?: string;
  created_at: string;
  is_read: boolean;
  category?: "All" | "For you" | "Activity" | "System";
}

function NotificationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"All" | "For you" | "Activity" | "System">("All");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check admin role
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

  // Load notifications and subscribe to real-time inserts
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    async function loadNotifications() {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        setNotifications(data as NotificationItem[]);
      }
      setLoading(false);
    }

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    window.dispatchEvent(new CustomEvent("notifications-read"));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    setNotifications([]);
    window.dispatchEvent(new CustomEvent("notifications-read"));
    await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "All") return true;
    return n.category === activeTab;
  });

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-24 text-neutral-900 dark:text-white transition-colors duration-200">
      <ShowcaseHeroBanner>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/45 dark:bg-black/55 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.5)] w-fit">
          <Bell size={13} className="text-[#f45b95]" />
          <span className="text-xs font-black tracking-wider text-white uppercase drop-shadow-sm">
            NOTIFICATIONS & ACTIVITY
          </span>
        </div>
      </ShowcaseHeroBanner>

      <div className="w-full max-w-2xl flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {(["All", "For you", "Activity", ...(isAdmin ? ["System"] : [])] as const).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300/80 dark:border-white/10 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 transition"
          >
            <CheckCheck size={12} className="text-[#f45b95]" />
            <span>Mark all as read</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {loading ? (
          <div className="w-full py-16 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 rounded-[28px] bg-white dark:bg-[#16171f] border border-neutral-200/80 dark:border-white/[0.08] text-center flex flex-col items-center justify-center gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <Sparkles size={18} />
            </div>
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              No notifications in {activeTab.toLowerCase()}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const rawText = notif.body || notif.content || "";
            const uppercaseText = rawText.toUpperCase();

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full flex items-center justify-between p-5 rounded-[24px] border transition shadow-sm cursor-pointer hover:border-[#f45b95]/50 ${
                  notif.is_read
                    ? "bg-white/70 dark:bg-[#16171f]/70 border-neutral-200/60 dark:border-white/[0.04]"
                    : "bg-white dark:bg-[#16171f] border-[#f45b95]/40 dark:border-[#f45b95]/30 ring-1 ring-[#f45b95]/20"
                }`}
              >
                <div className="flex items-center gap-5 pl-2 min-w-0 flex-1">
                  {/* Unread Pink Dot with clean space before avatar */}
                  <div className="w-3 shrink-0 flex items-center justify-center">
                    {!notif.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f45b95] shadow-[0_0_8px_rgba(244,91,149,0.8)]" />
                    )}
                  </div>

                  {/* Avatar Icon */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {notif.avatar_url ? (
                      <img src={notif.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-black text-sm">
                        {rawText.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Uppercase Notification Text and Timestamp */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1 justify-center">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-semibold break-words">
                      {notif.type === "direct_message" ? (
                        <>
                          <span className="uppercase font-bold">{notif.actor_name || notif.title?.split(" ")[0]}</span> has messaged you!
                        </>
                      ) : (
                        <span className="uppercase">{uppercaseText}</span>
                      )}
                    </p>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {new Date(notif.created_at).toLocaleDateString()} at{" "}
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}