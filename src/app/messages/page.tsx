"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import ImageUploadModal from "@/components/ImageUploadModal";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "👎"];

interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  user_number?: number;
}

interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  other: PublicProfile;
  preview: string;
}

interface ReplyPreview {
  id: string;
  body: string;
  sender_id: string;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  media: MessageAttachment[];
  reply_to: string | null;
  replyPreview?: ReplyPreview | null;
  reactions?: MessageReaction[];
  created_at: string;
  edited_at: string | null;
}

interface MessageAttachment {
  path: string;
  contentType: string;
  name: string;
  signedUrl?: string;
  localPreviewUrl?: string; // For instant local previews before/during send
}

interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

async function addReplyPreviews(messages: DirectMessage[]) {
  const replyIds = [
    ...new Set(
      messages
        .map((message) => message.reply_to)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (replyIds.length === 0) {
    return messages.map((message) => ({ ...message, replyPreview: null }));
  }

  const { data } = await supabase
    .from("dm_messages")
    .select("id, body, sender_id")
    .in("id", replyIds);

  const previews = new Map((data ?? []).map((message) => [message.id, message]));

  return messages.map((message) => ({
    ...message,
    replyPreview: message.reply_to
      ? previews.get(message.reply_to) ?? null
      : null,
  }));
}

async function addMessageReactions(messages: DirectMessage[]) {
  const ids = messages.map((message) => message.id);

  if (ids.length === 0) return messages;

  const { data, error } = await supabase
    .from("dm_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", ids);

  if (error) {
    console.error("Could not load message reactions:", error.message);
    return messages;
  }

  const byMessage = new Map<string, MessageReaction[]>();

  for (const reaction of data ?? []) {
    const list = byMessage.get(reaction.message_id) ?? [];
    list.push(reaction);
    byMessage.set(reaction.message_id, list);
  }

  return messages.map((message) => ({
    ...message,
    reactions: byMessage.get(message.id) ?? [],
  }));
}

// Generate signed URLs for private storage files so they render in chat
async function addSignedUrls(messages: DirectMessage[]) {
  return Promise.all(
    messages.map(async (message) => {
      if (!message.media || message.media.length === 0) return message;

      const updatedMedia = await Promise.all(
        message.media.map(async (attachment) => {
          if (attachment.path.startsWith("http")) {
            return { ...attachment, signedUrl: attachment.path };
          }

          const { data, error } = await supabase.storage
            .from("dm-attachments")
            .createSignedUrl(attachment.path, 3600); // 1 hour valid

          if (error) {
            console.error("Error creating signed URL:", error.message);
            return attachment;
          }

          return { ...attachment, signedUrl: data.signedUrl };
        })
      );

      return { ...message, media: updatedMedia };
    })
  );
}

export default function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [pendingMedia, setPendingMedia] = useState<MessageAttachment[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ?? null;

  // Load conversations and the other participant's public profile.
  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      if (!user) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      setLoadingConversations(true);
      setErrorMessage("");

      const { data: rows, error } = await supabase
        .from("dm_conversations")
        .select("id, user_a, user_b, last_message_at")
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setErrorMessage(`Could not load conversations: ${error.message}`);
        setLoadingConversations(false);
        return;
      }

      if (!rows?.length) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      const otherIds = rows.map((row) =>
        row.user_a === user.id ? row.user_b : row.user_a
      );

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds);

      if (cancelled) return;

      if (profileError) {
        setErrorMessage(
          `Could not load conversation profiles: ${profileError.message}`
        );
        setLoadingConversations(false);
        return;
      }

      const profileById = new Map(
        (profileRows ?? []).map((profile) => [profile.id, profile])
      );

      const loaded: Conversation[] = await Promise.all(
        rows.map(async (row) => {
          const otherId = row.user_a === user.id ? row.user_b : row.user_a;
          const other = profileById.get(otherId) ?? {
            id: otherId,
            username: "writer",
            display_name: "Writer",
            avatar_url: null,
          };

          const { data: latestMessage } = await supabase
            .from("dm_messages")
            .select("body")
            .eq("conversation_id", row.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...row,
            other,
            preview: latestMessage?.body || "No messages yet",
          };
        })
      );

      if (cancelled) return;

      setConversations(loaded);

      if (selectedId && !loaded.some((conversation) => conversation.id === selectedId)) {
        setSelectedId(null);
      }

      setLoadingConversations(false);
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [user, selectedId, messages.length]);

  // Load messages for the selected conversation and mark it read.
  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!user || !selectedId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("dm_messages")
        .select("id, conversation_id, sender_id, body, media, reply_to, created_at, edited_at")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (error) {
        setErrorMessage(`Could not load messages: ${error.message}`);
        setLoadingMessages(false);
        return;
      }

      const orderedMessages = [...(data ?? [])].reverse() as DirectMessage[];
      const withReplyPreviews = await addReplyPreviews(orderedMessages);
      const withReactions = await addMessageReactions(withReplyPreviews);
      const withSignedUrls = await addSignedUrls(withReactions);
      setMessages(withSignedUrls);

      const { error: readError } = await supabase
        .from("dm_reads")
        .upsert(
          {
            conversation_id: selectedId,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" }
        );

      if (readError && !cancelled) {
        setErrorMessage(`Messages loaded, but read status failed: ${readError.message}`);
      }

      if (!cancelled) setLoadingMessages(false);
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [user, selectedId]);

  // Live updates for selected conversation
  useEffect(() => {
    if (!user || !selectedId) return;

    const channel = supabase
      .channel(`dm-messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as DirectMessage;
            const [messageWithPreview] = await addReplyPreviews([incoming]);
            const [messageWithReaction] = await addMessageReactions([messageWithPreview]);
            const [finalMessage] = await addSignedUrls([messageWithReaction]);

            setMessages((current) => {
              if (current.some((message) => message.id === finalMessage.id)) {
                return current;
              }

              return [...current, finalMessage].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as DirectMessage;
            const [finalUpdated] = await addSignedUrls([updated]);

            setMessages((current) =>
              current.map((message) =>
                message.id === finalUpdated.id ? finalUpdated : message
              )
            );
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as Partial<DirectMessage>;

            setMessages((current) =>
              current.filter((message) => message.id !== deleted.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, selectedId]);

  // Live Auto-Suggestions & Search for writers (Loads top 3 initially on focus, filters as user types starting with query)
  useEffect(() => {
    let cancelled = false;

    async function fetchWriterSuggestions() {
      if (!user || !isSearchFocused) {
        if (!isSearchFocused && !search) setProfiles([]);
        return;
      }

      const searchTerm = search.trim();
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user.id)
        .limit(3);

      if (searchTerm) {
        query = query.or(
          `username.ilike.${searchTerm}%,display_name.ilike.${searchTerm}%`
        );
      } else {
        // Default top 3 recent/active profiles when search is empty and focused
        query = query.order("updated_at", { ascending: false, nullsFirst: false });
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        // Fallback if updated_at isn't present
        const { data: fallbackData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .neq("id", user.id)
          .limit(3);
        if (!cancelled) setProfiles(fallbackData ?? []);
        return;
      }

      setProfiles(data ?? []);
    }

    fetchWriterSuggestions();

    return () => {
      cancelled = true;
    };
  }, [search, isSearchFocused, user]);

  // Create or open a direct conversation.
  const handleOpenConversation = async (profile: PublicProfile) => {
    setErrorMessage("");

    const { data: conversationId, error } = await supabase.rpc(
      "get_or_create_dm",
      { _other_user_id: profile.id }
    );

    if (error) {
      setErrorMessage(`Could not open conversation: ${error.message}`);
      return;
    }

    setProfiles([]);
    setSearch("");
    setIsSearchFocused(false);
    setSelectedId(conversationId);
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const body = draft.trim();
    if (!user || !selectedId || (!body && pendingMedia.length === 0) || sending) return;
    setSending(true);
    setErrorMessage("");

    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: selectedId,
      sender_id: user.id,
      body,
      reply_to: replyingTo?.id ?? null,
      media: pendingMedia.map(({ path, contentType, name }) => ({
        path,
        contentType,
        name,
      })),
    });

    if (error) {
      setErrorMessage(`Could not send message: ${error.message}`);
      setSending(false);
      return;
    }

    setDraft("");
    setPendingMedia([]);
    setReplyingTo(null);

    const { data, error: reloadError } = await supabase
      .from("dm_messages")
      .select("id, conversation_id, sender_id, body, media, reply_to, created_at, edited_at")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (reloadError) {
      setErrorMessage(`Message sent, but could not refresh the conversation: ${reloadError.message}`);
    } else {
      const orderedMessages = await addReplyPreviews(
        [...(data ?? [])].reverse() as DirectMessage[]
      );
      const withReactions = await addMessageReactions(orderedMessages);
      setMessages(await addSignedUrls(withReactions));
    }

    setSending(false);
  };

  const handleStartEdit = (message: DirectMessage) => {
    setEditingId(message.id);
    setEditingDraft(message.body);
    setErrorMessage("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDraft("");
  };

  const handleSaveEdit = async (messageId: string) => {
    const body = editingDraft.trim();

    if (!user || !body) {
      setErrorMessage("A message cannot be empty.");
      return;
    }

    const { data, error } = await supabase
      .from("dm_messages")
      .update({
        body,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user.id)
      .select("id, conversation_id, sender_id, body, media, reply_to, created_at, edited_at")
      .single();

    if (error) {
      setErrorMessage(`Could not edit message: ${error.message}`);
      return;
    }

    const [messageWithPreview] = await addReplyPreviews([data as DirectMessage]);
    const [finalMessage] = await addSignedUrls([messageWithPreview]);

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? finalMessage : message
      )
    );

    setDraft("");
    setPendingMedia([]);
    setReplyingTo(null);
    setEditingId(null);
    setEditingDraft("");
  };

  // Handle Clipboard Paste (Ctrl+V / Cmd+V images directly into chat)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (!file || !user || !selectedId) continue;

        e.preventDefault();
        setUploadingMedia(true);
        try {
          const fileExt = file.name.split(".").pop() || "png";
          const path = `${selectedId}/${user.id}/${crypto.randomUUID()}.${fileExt}`;
          const { error } = await supabase.storage
            .from("dm-attachments")
            .upload(path, file, { contentType: file.type });

          if (error) throw error;

          const localPreviewUrl = URL.createObjectURL(file);

          setPendingMedia((current) => [
            ...current,
            { path, contentType: file.type, name: file.name || "pasted-image.png", localPreviewUrl },
          ]);
        } catch (err: any) {
          setErrorMessage(`Paste upload failed: ${err.message}`);
        } finally {
          setUploadingMedia(false);
        }
      }
    }
  };

  // Attachments via File Input
  const handleAttachmentSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!user || !selectedId || files.length === 0) return;

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]);

    const maxBytes = 50 * 1024 * 1024;

    setUploadingMedia(true);
    setErrorMessage("");

    try {
      const uploaded: MessageAttachment[] = [];

      for (const file of files) {
        if (!allowedTypes.has(file.type)) {
          throw new Error("Choose a JPG, PNG, GIF, WebP, MP4, WebM, or MOV file.");
        }

        if (file.size > maxBytes) {
          throw new Error("Each attachment must be 50 MB or smaller.");
        }

        const path = `${selectedId}/${user.id}/${crypto.randomUUID()}`;

        const { error } = await supabase.storage
          .from("dm-attachments")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) throw error;

        const localPreviewUrl = URL.createObjectURL(file);

        uploaded.push({
          path,
          contentType: file.type,
          name: file.name,
          localPreviewUrl,
        });
      }

      setPendingMedia((current) => [...current, ...uploaded]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Attachment upload failed."
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle Image selected from ImageUploadModal (local file or URL link)
  const handleModalImageSelect = (urlOrPath: string) => {
    const isUrl = urlOrPath.startsWith("http");
    setPendingMedia((current) => [
      ...current,
      {
        path: urlOrPath,
        contentType: isUrl ? "image/url" : "image/png",
        name: isUrl ? "Linked Image" : "Uploaded Image",
      },
    ]);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !confirm("Delete this message?")) return;

    const { error } = await supabase
      .from("dm_messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      setErrorMessage(`Could not delete message: ${error.message}`);
      return;
    }

    setMessages((current) => current.filter((message) => message.id !== messageId));
  };

  const handleToggleReaction = async (message: DirectMessage, emoji: string) => {
    if (!user) return;

    const existing = message.reactions?.find(
      (reaction) => reaction.user_id === user.id && reaction.emoji === emoji
    );

    const result = existing
      ? await supabase
          .from("dm_reactions")
          .delete()
          .eq("message_id", message.id)
          .eq("user_id", user.id)
          .eq("emoji", emoji)
      : await supabase.from("dm_reactions").insert({
          message_id: message.id,
          user_id: user.id,
          emoji,
        });

    if (result.error) {
      setErrorMessage(`Could not update reaction: ${result.error.message}`);
      return;
    }

    const { data, error } = await supabase
      .from("dm_reactions")
      .select("message_id, user_id, emoji")
      .eq("message_id", message.id);

    if (error) {
      setErrorMessage(`Could not refresh reactions: ${error.message}`);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, reactions: data ?? [] }
          : item
      )
    );
  };

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const initials = (profile: PublicProfile) =>
    (profile.display_name || profile.username || "U").slice(0, 2).toUpperCase();

  return (
    <main className="h-[calc(100dvh-9rem)] min-h-[420px] overflow-hidden rounded-[26px] border border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-[#0d0e12] dark:text-white">
      <div className="grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
        {/* Conversation list */}
        <aside
          className={`flex min-h-0 flex-col border-neutral-200 dark:border-neutral-800 ${
            selectedId ? "hidden md:flex" : "flex"
          } md:border-r`}
        >
          <div className="relative border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h1 className="mb-3 text-xl font-black">Messages</h1>

            <div className="relative flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search writers by username</span>
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Slight delay to allow clicking a profile suggestion
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                  placeholder="Find a writer"
                  className="h-10 w-full rounded-full bg-neutral-100 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#f45b95] dark:bg-neutral-900"
                />
              </label>
            </div>

            {isSearchFocused && profiles.length > 0 && (
              <div className="absolute left-4 right-4 top-full z-30 mt-1 flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {search.trim() ? "Matching Writers" : "Suggested Writers"}
                </div>
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur before click triggers
                    onClick={() => handleOpenConversation(profile)}
                    className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f45b95] text-xs font-bold text-white">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(profile)
                      )}
                    </div>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {profile.display_name || profile.user_number}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        @{profile.user_number}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <p className="p-4 text-sm text-neutral-500">Loading conversations…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">
                No conversations yet. Search for a writer to start one.
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                    selectedId === conversation.id
                      ? "bg-neutral-100 dark:bg-neutral-800"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f45b95] text-xs font-bold text-white">
                    {conversation.other.avatar_url ? (
                      <img
                        src={conversation.other.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(conversation.other)
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {conversation.other.display_name || conversation.other.username}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {conversation.preview}
                    </span>
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatTime(conversation.last_message_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Message conversation */}
        <section
          className={`min-h-0 flex-col ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <>
              <header className="flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full p-2 text-[#007aff] md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#f45b95] text-xs font-bold text-white">
                  {selectedConversation.other.avatar_url ? (
                    <img
                      src={selectedConversation.other.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(selectedConversation.other)
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">
                    {selectedConversation.other.display_name ||
                      selectedConversation.other.username}
                  </h2>
                  <p className="truncate text-xs text-neutral-500">
                    @{selectedConversation.other.username}
                  </p>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[#f5f5f7] p-4 dark:bg-black">
                {loadingMessages ? (
                  <p className="m-auto text-sm text-neutral-500">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <div className="m-auto text-center text-sm text-neutral-500">
                    <MessageCircle className="mx-auto mb-2" size={28} />
                    <p>Start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender_id === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex items-center gap-2 ${
                          mine ? "flex-row-reverse justify-start" : "justify-start"
                        }`}
                      >
                        {/* Bubble and reactions are stacked vertically */}
                        <div
                          className={`relative flex max-w-[80%] flex-col ${
                            mine ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                              mine
                                ? "rounded-br-md bg-[#007aff] text-white"
                                : "rounded-bl-md bg-white text-neutral-900 dark:bg-[#262629] dark:text-white"
                            }`}
                          >
                            {message.replyPreview && (
                              <div
                                className={`mb-2 rounded-xl px-3 py-2 text-xs ${
                                  mine
                                    ? "bg-white/15 text-white"
                                    : "bg-neutral-100 text-neutral-700 dark:bg-black/20 dark:text-neutral-200"
                                }`}
                              >
                                <div className="font-bold">
                                  {message.replyPreview.sender_id === user?.id
                                    ? "You"
                                    : selectedConversation.other.display_name ||
                                      selectedConversation.other.username}
                                </div>
                                <div className="mt-0.5 line-clamp-2 opacity-80">
                                  {message.replyPreview.body}
                                </div>
                              </div>
                            )}

                            {/* Render attached media inside bubble using signedUrl */}
                            {message.media && message.media.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {message.media.map((attachment, idx) => {
                                  const displayUrl = attachment.signedUrl || attachment.path;

                                  return (
                                    <div
                                      key={idx}
                                      className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900"
                                    >
                                      {attachment.contentType?.startsWith("video/") ? (
                                        <video
                                          src={displayUrl}
                                          controls
                                          className="max-h-48 max-w-full object-cover"
                                        />
                                      ) : (
                                        <img
                                          src={displayUrl}
                                          alt={attachment.name || "Attachment"}
                                          className="max-h-48 max-w-full object-cover"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {editingId === message.id ? (
                              <div className="min-w-48">
                                <textarea
                                  value={editingDraft}
                                  onChange={(e) => setEditingDraft(e.target.value)}
                                  rows={Math.min(6, Math.max(2, editingDraft.split("\n").length))}
                                  autoFocus
                                  className={`w-full resize-y rounded-lg px-2 py-1 text-sm outline-none ${
                                    mine
                                      ? "bg-white/15 text-white placeholder:text-white/70"
                                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                                  }`}
                                  aria-label="Edit message"
                                />

                                <div className="mt-2 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    aria-label="Cancel edit"
                                    title="Cancel"
                                    className="rounded-full p-1 text-current opacity-70 hover:opacity-100"
                                  >
                                    <X size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(message.id)}
                                    aria-label="Save edit"
                                    title="Save"
                                    className="rounded-full p-1 text-current hover:opacity-75"
                                  >
                                    <Check size={15} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {message.body}
                                <div
                                  className={`mt-1 text-right text-[10px] ${
                                    mine ? "text-white/70" : "text-neutral-400"
                                  }`}
                                >
                                  {formatTime(message.created_at)}
                                  {message.edited_at ? " · Edited" : ""}
                                </div>
                              </>
                            )}
                            {(message.reactions?.length ?? 0) > 0 && (
                              <div
                                className={`absolute -top-3 z-10 flex max-w-40 flex-wrap gap-0.5 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs shadow-sm dark:border-neutral-700 dark:bg-[#262629] ${
                                  mine ? "-left-2" : "-right-2"
                                }`}
                              >
                                {[...new Set(message.reactions?.map((reaction) => reaction.emoji))].map(
                                  (emoji) => {
                                    const group = message.reactions?.filter(
                                      (reaction) => reaction.emoji === emoji
                                    ) ?? [];
                                    const reactedByMe = group.some(
                                      (reaction) => reaction.user_id === user?.id
                                    );

                                    return (
                                      <span
                                        key={emoji}
                                        className={reactedByMe ? "text-[#007aff]" : ""}
                                        title={`${group.length} reaction${group.length === 1 ? "" : "s"}`}
                                      >
                                        {emoji}
                                        {group.length > 1 && (
                                          <span className="ml-0.5 text-[10px] text-neutral-500">
                                            {group.length}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reply and message-options buttons */}
                        {editingId !== message.id && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(message)}
                              aria-label="Reply to message"
                              title="Reply"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-[#007aff] dark:bg-[#262629] dark:text-neutral-300"
                            >
                              <Reply size={14} />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenReactionPickerId((current) =>
                                    current === message.id ? null : message.id
                                  )
                                }
                                aria-label="Add reaction"
                                aria-expanded={openReactionPickerId === message.id}
                                title="Add reaction"
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-[#007aff] dark:bg-[#262629] dark:text-neutral-300"
                              >
                                <Smile size={15} />
                              </button>

                              {openReactionPickerId === message.id && (
                                <div className="absolute right-0 top-full z-30 mt-2 flex gap-1 rounded-full border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-[#262629]">
                                  {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={async () => {
                                        await handleToggleReaction(message, emoji);
                                        setOpenReactionPickerId(null);
                                      }}
                                      aria-label={`React with ${emoji}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {mine && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMessageMenuId((current) =>
                                      current === message.id ? null : message.id
                                    )
                                  }
                                  aria-label="Message options"
                                  aria-expanded={openMessageMenuId === message.id}
                                  title="Message options"
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-neutral-900 dark:bg-[#262629] dark:text-neutral-300 dark:hover:text-white"
                                >
                                  <MoreHorizontal size={16} />
                                </button>

                                {openMessageMenuId === message.id && (
                                  <div className="absolute right-0 top-full z-20 mt-1 min-w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-[#262629]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleStartEdit(message);
                                        setOpenMessageMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMessageMenuId(null);
                                        void handleDeleteMessage(message.id);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="relative flex shrink-0 items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
              >
                <label className="sr-only" htmlFor="dm-message">
                  Message
                </label>

                {/* Replying banner */}
                {replyingTo && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 flex items-center justify-between rounded-xl bg-neutral-100 p-2 text-xs dark:bg-neutral-800">
                    <span className="truncate">
                      Replying to: {replyingTo.body || "message"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="ml-2 shrink-0 font-bold text-[#007aff]"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Pending Media Preview Drawer */}
                {pendingMedia.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 flex items-center gap-2 overflow-x-auto rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800">
                    {pendingMedia.map((media, idx) => {
                      const previewUrl = media.localPreviewUrl || media.path;

                      return (
                        <div
                          key={idx}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"
                        >
                          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setPendingMedia((current) =>
                                current.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentSelect}
                />

                {/* Local file picker button */}
                <button
                  type="button"
                  disabled={uploadingMedia}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach local files"
                  title={uploadingMedia ? "Uploading…" : "Attach local files"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 disabled:opacity-50 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {uploadingMedia ? "…" : "+"}
                </button>

                {/* Modal Trigger Button (Upload via local / link / popup) */}
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  aria-label="Open image upload modal"
                  title="Upload image or link URL"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 hover:text-[#007aff]"
                >
                  <ImageIcon size={18} />
                </button>

                <textarea
                  id="dm-message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="iMessage or paste image (Ctrl+V)"
                  className="max-h-32 min-h-11 flex-1 resize-y rounded-2xl bg-neutral-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007aff] dark:bg-neutral-900"
                />
                <button
                  type="submit"
                  disabled={(!draft.trim() && pendingMedia.length === 0) || sending || uploadingMedia}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#007aff] text-white disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto hidden text-center text-neutral-400 md:block">
              <MessageCircle className="mx-auto mb-3" size={38} />
              <p className="text-sm">Choose a conversation or search for a writer.</p>
            </div>
          )}
        </section>
      </div>

      {/* Reusable Image Upload Modal (Shared with profile settings / character creation) */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={(urlOrPath) => {
          const isUrl = urlOrPath.startsWith("http");
          setPendingMedia((current) => [
            ...current,
            {
              path: urlOrPath,
              contentType: isUrl ? "image/url" : "image/png",
              name: isUrl ? "Linked Image" : "Uploaded Image",
            },
          ]);
        }}
        title="Attach Media to Message"
        bucketName="dm-attachments"
        pathPrefix={selectedId && user ? `${selectedId}/${user.id}` : "uploads"}
      />

      {errorMessage && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700 shadow-lg dark:bg-rose-950 dark:text-rose-200"
        >
          {errorMessage}
        </div>
      )}
    </main>
  );
}