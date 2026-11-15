"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Tv, 
  Trash2, 
  Send, 
  Edit3, 
  Clock, 
  Plus, 
  ChevronDown,
  X,
  Upload,
  BarChart2,
  MapPin,
  Music,
  Heart,
  Save,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

interface DraftPost {
  id: string;
  character_id: string;
  post_type: "text" | "photo" | "video" | "voice" | "stream";
  content?: string;
  images?: string[];
  video_url?: string;
  audio_url?: string;
  stream_title?: string;
  stream_viewers?: number;
  location?: string;
  song?: any;
  poll?: any;
  created_at: string;
  characters?: {
    name: string;
    avatar_url?: string;
    user_colors?: string[];
    followers_count?: number;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DraftsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  // Writer characters for creating a draft post
  const [writerCharacters, setWriterCharacters] = useState<any[]>([]);
  const [postingAsCharacterId, setPostingAsCharacterId] = useState("");

  // New Post Form State
  const [postType, setPostType] = useState<"text" | "photo" | "video" | "voice" | "stream">("text");
  const [postCaption, setPostCaption] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVideos, setPostVideos] = useState<string[]>([]);
  const [postAudioUrl, setPostAudioUrl] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamViewers, setStreamViewers] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [behindTheStory, setBehindTheStory] = useState("");
  
  // Interactive Feature Toggles
  const [showPollConfig, setShowPollConfig] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  
  const [showSongConfig, setShowSongConfig] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songLink, setSongLink] = useState("");

  const [showLikesConfig, setShowLikesConfig] = useState(false);
  const [manualLikes, setManualLikes] = useState("");
  const [manualComments, setManualComments] = useState("");
  const [postDate, setPostDate] = useState("");

  const [publishingPost, setPublishingPost] = useState(false);

  // Post Media Submodal State
  const [isPostMediaModalOpen, setIsPostMediaModalOpen] = useState(false);
  const [postMediaMode, setPostMediaMode] = useState<"upload" | "url">("upload");
  const [postMediaInputUrl, setPostMediaInputUrl] = useState("");
  const [uploadingPostMedia, setUploadingPostMedia] = useState(false);
  const postMediaFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);

      const { data: draftData, error } = await supabase
        .from("posts")
        .select(`
          *,
          characters (
            name,
            avatar_url,
            user_colors,
            followers_count
          )
        `)
        .eq("user_id", user.id)
        .eq("is_draft", true)
        .order("created_at", { ascending: false });

      if (!error && draftData) {
        setDrafts(draftData);
      }

      const { data: userChars } = await supabase
        .from("characters")
        .select("id, name, avatar_url, user_colors, followers_count")
        .eq("user_id", user.id);

      if (userChars && userChars.length > 0) {
        setWriterCharacters(userChars);
        setPostingAsCharacterId(userChars[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, [user]);

  const handlePostNow = async (draft: DraftPost) => {
    const followers = draft.characters?.followers_count || 100;
    const calcLikes = Math.floor(followers * (0.2 + Math.random() * 0.2));
    const calcComments = Math.floor(calcLikes / 3);

    const { error } = await supabase
      .from("posts")
      .update({ 
        is_draft: false, 
        likes_count: calcLikes,
        comments_count: calcComments,
        created_at: new Date().toISOString() 
      })
      .eq("id", draft.id);

    if (!error) {
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } else {
      alert("Error publishing draft: " + error.message);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", draftId);

    if (!error) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } else {
      alert("Error deleting draft: " + error.message);
    }
  };

  const handleSaveAsDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postingAsCharacterId) return;

    try {
      setPublishingPost(true);
      const activeChar = writerCharacters.find((c) => c.id === postingAsCharacterId);
      const followers = activeChar?.followers_count || 100;
      
      const calcLikes = manualLikes ? parseInt(manualLikes, 10) : Math.floor(followers * (0.2 + Math.random() * 0.2));
      const calcComments = manualComments ? parseInt(manualComments, 10) : Math.floor(calcLikes / 3);

      const formattedPoll = pollQuestion.trim() ? {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()).length > 0 ? pollOptions.filter(o => o.trim()) : ["Yes", "No"],
        ratios: [68, 32]
      } : null;

      const formattedSong = songTitle.trim() ? {
        title: songTitle.trim(),
        artist: songArtist.trim() || "Unknown Artist",
        link: songLink.trim() || "#"
      } : null;

      const payload = {
        character_id: postingAsCharacterId,
        user_id: user.id,
        post_type: postType,
        content: postCaption || null,
        images: postImages.length > 0 ? postImages : null,
        video_url: postVideos.length > 0 ? postVideos[0] : null,
        audio_url: postAudioUrl || null,
        stream_title: streamTitle || null,
        stream_viewers: streamViewers ? parseInt(streamViewers, 10) : null,
        location: postLocation || null,
        song: formattedSong,
        poll: formattedPoll,
        behind_the_story: behindTheStory || null,
        likes_count: calcLikes,
        comments_count: calcComments,
        is_draft: true,
        created_at: postDate ? new Date(postDate).toISOString() : new Date().toISOString(),
      };

      const { data, error } = await supabase.from("posts").insert(payload).select(`
        *,
        characters (
          name,
          avatar_url,
          user_colors,
          followers_count
        )
      `).single();

      if (error) throw error;

      if (data) {
        setDrafts((prev) => [data, ...prev]);
      }

      setIsNewPostModalOpen(false);
      setPostCaption("");
      setPostImages([]);
      setPostVideos([]);
      setPostAudioUrl("");
      setStreamTitle("");
      setStreamViewers("");
      setPostLocation("");
      setShowPollConfig(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowSongConfig(false);
      setSongTitle("");
      setSongArtist("");
      setSongLink("");
      setShowLikesConfig(false);
      setBehindTheStory("");
      setManualLikes("");
      setManualComments("");
      setPostDate("");
    } catch (err: any) {
      alert("Error saving draft: " + err.message);
    } finally {
      setPublishingPost(false);
    }
  };

  const handlePostMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPostMedia(true);
      const ext = file.name.split(".").pop();
      const path = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      if (postType === "photo") {
        setPostImages((prev) => [...prev, publicUrl]);
      } else if (postType === "video") {
        setPostVideos((prev) => [...prev, publicUrl]);
      }
      setIsPostMediaModalOpen(false);
    } catch (err: any) {
      alert("Media upload failed: " + err.message);
    } finally {
      setUploadingPostMedia(false);
    }
  };

  const handleApplyPostMediaUrl = (url: string) => {
    if (!url.trim()) return;
    if (postType === "photo") {
      setPostImages((prev) => [...prev, url.trim()]);
    } else if (postType === "video") {
      setPostVideos((prev) => [...prev, url.trim()]);
    }
    setPostMediaInputUrl("");
    setIsPostMediaModalOpen(false);
  };

  const movePhoto = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= postImages.length) return;
    const updated = [...postImages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPostImages(updated);
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case "photo": return <ImageIcon size={14} className="text-pink-500" />;
      case "video": return <Video size={14} className="text-purple-500" />;
      case "voice": return <Mic size={14} className="text-emerald-500" />;
      case "stream": return <Tv size={14} className="text-blue-500" />;
      default: return <FileText size={14} className="text-neutral-400" />;
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
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-6 font-sans text-neutral-900 dark:text-white px-3 sm:px-0">
      
      {/* Header with Glossy Pill & Create Draft Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider">Your Drafts</h1>
          <p className="text-xs text-neutral-400 font-medium">Manage and publish your saved posts</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Glossy Pill Counter with Pink Accent */}
          <div className="px-4 py-1.5 rounded-full bg-white dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 shadow-sm text-xs font-black flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f45b95] shadow-[0_0_8px_rgba(244,91,149,0.8)]" />
            <span>{drafts.length} {drafts.length === 1 ? "Draft Saved" : "Drafts Saved"}</span>
          </div>

          {/* Create Draft Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-black shadow-md transition hover:scale-105"
              style={{ background: "linear-gradient(135deg, #f45b95, #c084fc)" }}
            >
              <Plus size={14} />
              <span>Create Draft</span>
              <ChevronDown size={14} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-1.5 flex flex-col z-30 text-xs font-bold text-neutral-900 dark:text-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsNewPostModalOpen(true);
                  }}
                  className="px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/5 transition"
                >
                  Create a Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    alert("Musing drafts coming soon!");
                  }}
                  className="px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/5 transition text-neutral-400"
                >
                  Musing (Coming Soon)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    alert("Wanted connection drafts coming soon!");
                  }}
                  className="px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/5 transition text-neutral-400"
                >
                  Wanted Connection (Coming Soon)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    alert("Episode drafts coming soon!");
                  }}
                  className="px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/5 transition text-neutral-400"
                >
                  Episode (Coming Soon)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[28px]">
          You have no saved drafts right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {drafts.map((draft) => {
            const charColor = draft.characters?.user_colors?.[0] || "#f45b95";
            return (
              <div 
                key={draft.id} 
                className="p-5 rounded-[24px] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col gap-4"
              >
                {/* Header: Author Info & Post Type */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border border-neutral-200 dark:border-white/10 shrink-0">
                      {draft.characters?.avatar_url ? (
                        <img src={draft.characters.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-white text-xs">?</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase" style={{ color: charColor }}>
                        {draft.characters?.name || "Unknown Character"}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold">
                        <span className="flex items-center gap-1 uppercase tracking-wider">
                          {getPostTypeIcon(draft.post_type)} {draft.post_type}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> Saved {timeAgo(draft.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/50 dark:border-neutral-800 flex flex-col gap-3">
                  {draft.content && (
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-3 whitespace-pre-wrap">
                      {draft.content}
                    </p>
                  )}

                  {draft.images && draft.images.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {draft.images.map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800">
                          <img src={img} alt="Draft preview" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {draft.stream_title && (
                    <div className="text-xs font-bold text-blue-400">
                      Stream: {draft.stream_title}
                    </div>
                  )}
                </div>

                {/* Action Buttons (1. Edit button takes you to character's page) */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/phone/${draft.character_id}`)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostNow(draft)}
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-black text-white shadow-md transition"
                    style={{ background: charColor }}
                  >
                    <Send size={13} />
                    <span>Post Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DRAFT POST MODAL */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#16171f] text-neutral-900 dark:text-white rounded-[28px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-4 border border-neutral-200 dark:border-white/10">
            
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
              <h3 className="text-sm font-black uppercase tracking-wider">Create Draft Post</h3>
              <button type="button" onClick={() => setIsNewPostModalOpen(false)} className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveAsDraft} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Post as</label>
                <select
                  value={postingAsCharacterId}
                  onChange={(e) => setPostingAsCharacterId(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-bold outline-none focus:border-[#f45b95]"
                >
                  {writerCharacters.map((char) => (
                    <option key={char.id} value={char.id} className="bg-white dark:bg-[#16171f]">{char.name}</option>
                  ))}
                </select>
              </div>

              {/* Post Type Selector */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { type: "text", label: "Text", icon: FileText },
                  { type: "photo", label: "Photo", icon: ImageIcon },
                  { type: "video", label: "Video", icon: Video },
                  { type: "voice", label: "Voice note", icon: Mic },
                  { type: "stream", label: "Stream", icon: Tv },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = postType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setPostType(item.type as any)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition ${
                        active ? "bg-neutral-200 text-neutral-900 dark:bg-white/15 border-white/30 dark:text-white font-black" : "bg-neutral-100 dark:bg-[#1e2029] border-neutral-200 dark:border-white/5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Photo & Video Reordering Section */}
              {(postType === "photo" || postType === "video") && (
                <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      {postType === "photo" ? "Add Photos (Multiple allowed)" : "Add Videos (Multiple allowed)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPostMediaModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition hover:scale-105 flex items-center gap-1.5 bg-[#f45b95]"
                    >
                      <Upload size={13} />
                      <span>Upload or Link</span>
                    </button>
                  </div>

                  {postType === "photo" && postImages.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      {postImages.map((img, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <img src={img} alt="Upload" className="w-10 h-10 rounded-lg object-cover" />
                            <span className="text-[11px] font-bold">Photo #{idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => movePhoto(idx, "left")}
                              className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-white/10 disabled:opacity-30 flex items-center justify-center text-xs"
                              title="Move Left"
                            >
                              <ArrowLeft size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === postImages.length - 1}
                              onClick={() => movePhoto(idx, "right")}
                              className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-white/10 disabled:opacity-30 flex items-center justify-center text-xs"
                              title="Move Right"
                            >
                              <ArrowRight size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
                              className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center text-xs ml-1"
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {postType === "voice" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Voice Note Audio URL</label>
                  <input type="url" value={postAudioUrl} onChange={(e) => setPostAudioUrl(e.target.value)} placeholder="https://..." className="w-full h-10 px-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs outline-none" />
                </div>
              )}

              {postType === "stream" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Stream Title</label>
                    <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Late night chill..." className="w-full h-10 px-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Viewers Count</label>
                    <input type="text" value={streamViewers} onChange={(e) => setStreamViewers(e.target.value)} placeholder="1420" className="w-full h-10 px-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs outline-none" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">What&apos;s happening?</label>
                <textarea
                  rows={3}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-none focus:border-[#f45b95]"
                />
              </div>

              {/* Poll Configurator */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowPollConfig((prev) => !prev)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 cursor-pointer hover:border-neutral-300 transition w-full text-left"
                >
                  <div className="flex items-center gap-2.5 font-bold">
                    <BarChart2 size={15} />
                    <span>Add a poll</span>
                  </div>
                  <Plus size={15} className={`text-neutral-400 transition-transform ${showPollConfig ? "rotate-45" : ""}`} />
                </button>

                {showPollConfig && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-white/10 text-xs">
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 font-semibold outline-none"
                    />
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        className="w-full h-8 px-3 rounded-lg bg-white dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 font-semibold outline-none"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Behind the post (Only you see this)</label>
                <textarea
                  rows={2}
                  value={behindTheStory}
                  onChange={(e) => setBehindTheStory(e.target.value)}
                  placeholder="What's going on?"
                  className="w-full p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Location (Optional)</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    placeholder="Add a location"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Song Configurator */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowSongConfig((prev) => !prev)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 cursor-pointer hover:border-neutral-300 transition w-full text-left"
                >
                  <div className="flex items-center gap-2.5 font-bold">
                    <Music size={15} />
                    <span>Add a song</span>
                  </div>
                  <Plus size={15} className={`text-neutral-400 transition-transform ${showSongConfig ? "rotate-45" : ""}`} />
                </button>

                {showSongConfig && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-white/10 text-xs">
                    <input
                      type="text"
                      placeholder="Song Title"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 font-semibold outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Artist"
                      value={songArtist}
                      onChange={(e) => setSongArtist(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 font-semibold outline-none"
                    />
                    <input
                      type="url"
                      placeholder="Song Link"
                      value={songLink}
                      onChange={(e) => setSongLink(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 font-semibold outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-neutral-200 dark:bg-[#1e2029] border border-neutral-300 dark:border-white/10 hover:bg-neutral-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishingPost}
                  className="px-6 py-2.5 rounded-full text-white font-black shadow-md transition bg-[#f45b95]"
                >
                  {publishingPost ? "Saving..." : "Save Draft"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POST MEDIA SUBMODAL */}
      {isPostMediaModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] uppercase tracking-wider">Add {postType === "photo" ? "Photo" : "Video"}</span>
              <button type="button" onClick={() => setIsPostMediaModalOpen(false)} className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center"><X size={12} /></button>
            </div>
            <div className="flex rounded-full bg-neutral-100 dark:bg-[#1e2029] p-0.5 border border-neutral-200 dark:border-white/5">
              <button type="button" onClick={() => setPostMediaMode("upload")} className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${postMediaMode === "upload" ? "bg-white dark:bg-white/25 shadow-sm" : "text-neutral-500"}`}>Upload file</button>
              <button type="button" onClick={() => setPostMediaMode("url")} className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${postMediaMode === "url" ? "bg-white dark:bg-white/25 shadow-sm" : "text-neutral-500"}`}>Media Link</button>
            </div>
            {postMediaMode === "upload" ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-neutral-300 dark:border-white/20 rounded-xl">
                <input type="file" ref={postMediaFileInputRef} onChange={handlePostMediaUpload} accept={postType === "photo" ? "image/*" : "video/*"} className="hidden" />
                <button type="button" disabled={uploadingPostMedia} onClick={() => postMediaFileInputRef.current?.click()} className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold shadow-md transition bg-[#f45b95]">
                  {uploadingPostMedia ? "Uploading..." : "Browse files"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="url" placeholder="https://..." value={postMediaInputUrl} onChange={(e) => setPostMediaInputUrl(e.target.value)} className="w-full h-8 bg-neutral-100 dark:bg-[#191a21] border border-neutral-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none" />
                <button type="button" onClick={() => handleApplyPostMediaUrl(postMediaInputUrl)} className="w-full h-8 rounded-lg text-white text-[11px] font-bold bg-[#f45b95]">Add Link</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}