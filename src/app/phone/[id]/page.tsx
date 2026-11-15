"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  MoreHorizontal,
  Camera,
  UserPlus,
  UserCheck,
  MessageCircle,
  Edit3,
  PlusCircle,
  Grid,
  Tag,
  Film,
  Users,
  Calendar,
  FileText,
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  ChevronDown,
  FileSpreadsheet,
  Sparkles,
  Star,
  Clapperboard,
  Heart,
  Image as ImageIcon,
  Video,
  Mic,
  Tv,
  Music,
  MapPin,
  BarChart2,
  Lock,
  Save,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Pencil,
  Play,
  Volume2,
  VolumeX,
  Share2,
} from "lucide-react";

type CharacterTab = "Posts" | "Tagged" | "Episodes" | "Connections" | "Events" | "Profile";

interface DetailItem {
  key: string;
  value: string;
}

interface CharacterProfile {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string;
  cover_url?: string;
  portrait_url?: string;
  thread_avatar_url?: string;
  is_verified?: boolean;
  followers_count?: number;
  following_count?: number;
  tagline?: string;
  aka_line?: string;
  bio?: string;
  user_id: string;
  is_npc?: boolean;
  npc_tag?: string;
  npc_behavior?: "manual" | "bot" | "gossip";
  details?: DetailItem[];
  user_colors?: string[];
  use_gradient?: boolean;
  is_brand?: boolean;

  full_name?: string;
  nicknames?: string;
  age?: string;
  birthday?: string;
  zodiac?: string;
  pronouns?: string;
  gender?: string;
  sexuality?: string;
  height?: string;
  nationality?: string;
  hometown?: string;
  lives_in?: string;
  occupation?: string;
  relationship_status?: string;
  face_claim?: string;

  label?: string;
  signature_quote?: string;
  traits?: string;
  loves?: string;
  cant_stand?: string;
  goals?: string;
  notable_accomplishments?: string;

  heavy_influences?: string;
  personality?: string;
  appearance?: string;
  history?: string;

  fav_color?: string;
  music?: string;
  movies?: string;
  shows?: string;
  books?: string;
  hobbies?: string;
  food?: string;
  beverage?: string;
  season?: string;
  weather?: string;
  trivia?: string;
}

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

function formatCount(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const getPostImages = (post: any) => {
  if (!post) return [];
  if (Array.isArray(post.images)) return post.images.filter(Boolean);
  if (typeof post.images === "string") {
    try {
      const parsed = JSON.parse(post.images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return [post.images].filter(Boolean);
    }
  }
  if (post.image_url) return [post.image_url];
  return [];
};

const generateContextualComments = (post: any) => {
  const caption = (post.content || "").toLowerCase();
  const location = (post.location || "").toLowerCase();
  const mentionRelation = post.mention_relation || "friend";

  let basePool = [
    { name: "tunde_pics", handle: "tunde_pics", text: "Stop whoever's taking your pictures deserves a raise", time: "now", likes: 18, isChar: false, verified: false },
    { name: "marcus_tv", handle: "marcus_tv", text: "Okay is there a part 2 🔥", time: "now", likes: 12, isChar: false, verified: false },
    { name: "luciaxarchive", handle: "luciaxarchive", text: "Girl needed this on my feed today, thank u!!", time: "now", likes: 9, isChar: false, verified: false },
    { name: "siobhan_files", handle: "siobhan_files", text: "Nobody tell my mom I'm on here instead of studying 🫶", time: "now", likes: 5, isChar: false, verified: false },
    { name: "ardelldaily6", handle: "ardelldaily6", text: "The vibe here is unmatched", time: "now", likes: 6, isChar: false, verified: false },
    { name: "fan_no1", handle: "fan_no1", text: "Obsessed with this look omg", time: "now", likes: 4, isChar: false, verified: false },
    { name: "stan_acc", handle: "stan_acc", text: "We will be framing this immediately", time: "now", likes: 2, isChar: false, verified: false },
    { name: "foyaen_lover", handle: "foyaen_lover", text: "Iconic behavior honestly", time: "now", likes: 3, isChar: false, verified: false },
    { name: "vibe_check", handle: "vibe_check", text: "Can't cope with this era", time: "now", likes: 1, isChar: false, verified: false },
    { name: "real_talk", handle: "real_talk", text: "Legendary status", time: "now", likes: 7, isChar: false, verified: false },
    { name: "gossip_girl", handle: "gossip_girl", text: "Spilling tea as always", time: "now", likes: 11, isChar: false, verified: false },
    { name: "midnight_oil", handle: "midnight_oil", text: "This is pure art", time: "now", likes: 2, isChar: false, verified: false },
    { name: "charlie_x", handle: "charlie_x", text: "Speechless rn", time: "now", likes: 4, isChar: false, verified: false },
    { name: "extra_fan", handle: "extra_fan", text: "And another one! Iconic.", time: "now", likes: 8, isChar: false, verified: false },
    { name: "hater_1", handle: "hater_1", text: "Filter is a bit much ngl", time: "now", likes: 14, isChar: false, verified: false },
  ];

  if (location.includes("nyc") || location.includes("city")) {
    basePool.unshift({ name: "city_insider", handle: "city_insider", text: "Only you could make the city look like this", time: "now", likes: 22, isChar: false, verified: false });
  }

  if (mentionRelation === "ex") {
    basePool.unshift({ name: "watcher_01", handle: "watcher_01", text: "Bold of you to post this after everything", time: "now", likes: 45, isChar: false, verified: false });
  } else if (mentionRelation === "rival") {
    basePool.unshift({ name: "frenemy_report", handle: "frenemy_report", text: "Trying a bit too hard here aren't we", time: "now", likes: 31, isChar: false, verified: false });
  } else if (mentionRelation === "best_friend") {
    basePool.unshift({ name: "bff_official", handle: "bff_official", text: "THE CO-SIGN OF A CENTURY. MY TWIN.", time: "now", likes: 52, isChar: false, verified: true });
  }

  if (caption.includes("coffee") || caption.includes("cafe")) {
    basePool.unshift({ name: "caffeine_fiend", handle: "caffeine_fiend", text: "Need to join you next time", time: "now", likes: 15, isChar: false, verified: false });
  }

  return basePool.slice(0, 15);
};

export default function CharacterProfilePage() {
  const params = useParams();
  const characterId = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CharacterTab>("Posts");
  
  const [postsCount, setPostsCount] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [episodePostsCount, setEpisodePostsCount] = useState(0);
  const [totalWordsWritten, setTotalWordsWritten] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Writer's characters & platform characters for @mention autocomplete
  const [writerCharacters, setWriterCharacters] = useState<any[]>([]);
  const [allPlatformChars, setAllPlatformChars] = useState<any[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const [postingAsCharacterId, setPostingAsCharacterId] = useState("");
  const [commentingAsCharacterId, setCommentingAsCharacterId] = useState("");
  const [isManageFollowsOpen, setIsManageFollowsOpen] = useState(false);
  const [writerFollowStatusMap, setWriterFollowStatusMap] = useState<Record<string, boolean>>({});
  const [isCommentingCharacterDropdownOpen, setIsCommentingCharacterDropdownOpen] = useState(false);

  // Active Selected Post Modal State
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [activePostImageIdx, setActivePostImageIdx] = useState(0);
  const [postCommentInput, setPostCommentInput] = useState("");
  const [postCommentDate, setPostCommentDate] = useState("");
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  
  // Reply State per comment ID
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replyDate, setReplyDate] = useState("");
  const [replyingAsCharacterId, setReplyingAsCharacterId] = useState("");
  const [replyingCharacterDropdownOpen, setReplyingCharacterDropdownOpen] = useState(false);

  // Like as Character Menu State per post ID
  const [isLikeMenuOpen, setIsLikeMenuOpen] = useState(false);
  const [postLikedByMap, setPostLikedByMap] = useState<Record<string, any[]>>({});
  const [isAllLikesModalOpen, setIsAllLikesModalOpen] = useState(false);

  // Follows popup state
  const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarInputType, setAvatarInputType] = useState<"upload" | "url">("upload");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Modals & Refs
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPapersModalOpen, setIsPapersModalOpen] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postMediaFileInputRef = useRef<HTMLInputElement>(null);

  // Post Media Submodal State
  const [isPostMediaModalOpen, setIsPostMediaModalOpen] = useState(false);
  const [postMediaMode, setPostMediaMode] = useState<"upload" | "url">("upload");
  const [postMediaInputUrl, setPostMediaInputUrl] = useState("");
  const [uploadingPostMedia, setUploadingPostMedia] = useState(false);

  // New Post State & Interactive Collapsibles
  const [postType, setPostType] = useState<"text" | "photo" | "video" | "voice" | "stream">("text");
  const [postCaption, setPostCaption] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVideos, setPostVideos] = useState<string[]>([]);
  const [postAudioUrl, setPostAudioUrl] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamViewers, setStreamViewers] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [behindTheStory, setBehindTheStory] = useState("");
  const [mentionRelation, setMentionRelation] = useState<string>("friend");
  
  const [showPollConfig, setShowPollConfig] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  
  const [showSongConfig, setShowSongConfig] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songLink, setSongLink] = useState("");

  const [publishingPost, setPublishingPost] = useState(false);

  // Comprehensive Character Editor States
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [colorCount, setColorCount] = useState<1 | 2 | 3>(3);
  const [palette, setPalette] = useState<string[]>(["#f45b95", "#c084fc", "#93c5fd"]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [customThreadUrl, setCustomThreadUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [akaLine, setAkaLine] = useState("");
  const [bio, setBio] = useState("");
  const [customFollowers, setCustomFollowers] = useState("");
  const [customFollowing, setCustomFollowing] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isBrand, setIsBrand] = useState(false);
  const [isNpc, setIsNpc] = useState(false);
  const [npcCategories, setNpcCategories] = useState("");
  const [npcBehavior, setNpcBehavior] = useState<"manual" | "bot" | "gossip">("manual");
  const [papersForm, setPapersForm] = useState<Partial<CharacterProfile>>({});

  const [imageModalTarget, setImageModalTarget] = useState<"avatar" | "portrait" | "thread" | "cover" | null>(null);
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    async function loadCharacterData() {
      if (!characterId) return;
      setLoading(true);

      const { data: charData, error } = await supabase
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .maybeSingle();

      if (error || !charData) {
        console.error("Character not found:", error?.message);
        setLoading(false);
        return;
      }

      setCharacter(charData);
      setPapersForm(charData);
      setPostingAsCharacterId(charData.id);
      
      setName(charData.name || "");
      setHandle(charData.handle || "");
      setAvatarUrl(charData.avatar_url || "");
      setPortraitUrl(charData.portrait_url || "");
      setCustomThreadUrl(charData.thread_avatar_url || "");
      setCoverUrl(charData.cover_url || "");
      setTagline(charData.tagline || "");
      setAkaLine(charData.aka_line || "");
      setBio(charData.bio || "");
      setCustomFollowers(charData.followers_count ? String(charData.followers_count) : "");
      setCustomFollowing(charData.following_count ? String(charData.following_count) : "");
      setIsVerified(!!charData.is_verified);
      setIsBrand(!!charData.is_brand);
      setIsNpc(!!charData.is_npc);
      setNpcCategories(charData.npc_tag || "");
      setNpcBehavior(charData.npc_behavior || "manual");

      if (Array.isArray(charData.user_colors) && charData.user_colors.length > 0) {
        setColorCount(Math.min(charData.user_colors.length, 3) as 1 | 2 | 3);
        setPalette([
          charData.user_colors[0] || "#f45b95",
          charData.user_colors[1] || "#c084fc",
          charData.user_colors[2] || "#93c5fd",
        ]);
      }

      const { count, data: postData } = await supabase
        .from("posts")
        .select("*", { count: "exact" })
        .eq("character_id", charData.id)
        .eq("is_draft", false)
        .order("created_at", { ascending: false });

      setPostsCount(count || 0);
      setPosts(postData || []);

      const totalWords = (postData || []).reduce((acc, p) => acc + (p.content?.split(/\s+/)?.length || 0), 0);
      setTotalWordsWritten(totalWords);
      setEpisodePostsCount(postData?.length || 0);

      const { data: allChars } = await supabase
        .from("characters")
        .select("id, name, handle, avatar_url");
      setAllPlatformChars(allChars || []);

      if (user) {
        const { data: userChars } = await supabase
          .from("characters")
          .select("id, name, avatar_url, user_colors, followers_count, is_verified, handle, is_npc")
          .eq("user_id", user.id);
          
        setWriterCharacters(userChars || []);
        if (userChars && userChars.length > 0) {
          setCommentingAsCharacterId(userChars[0].id);
          setReplyingAsCharacterId(userChars[0].id);

          const charIds = userChars.map((c) => c.id);
          const { data: followsData } = await supabase
            .from("character_follows")
            .select("follower_id")
            .eq("character_id", charData.id)
            .in("follower_id", charIds);

          const statusMap: Record<string, boolean> = {};
          const followingIds = new Set((followsData || []).map((f) => f.follower_id));
          userChars.forEach((c) => {
            statusMap[c.id] = followingIds.has(c.id);
          });
          setWriterFollowStatusMap(statusMap);
          
          // Set overall follow state if at least one of the user's characters is following
          setIsFollowing(followingIds.size > 0);
        }
      }

      setLoading(false);
    }

    loadCharacterData();

    const followsChannel = supabase
      .channel(`public:character_follows:character_id=eq.${characterId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "character_follows", filter: `character_id=eq.${characterId}` },
        async () => {
          const { data: updatedChar } = await supabase
            .from("characters")
            .select("followers_count, following_count")
            .eq("id", characterId)
            .maybeSingle();

          if (updatedChar) {
            setCharacter((prev) => prev ? { ...prev, followers_count: updatedChar.followers_count } : null);
          }
          if (followModalType) {
            openFollowsModal(followModalType);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
    };
  }, [characterId, user]);

  const isOwner = user && character && user.id === character.user_id;

  const activeColors = palette.slice(0, colorCount);
  const isGradient = colorCount > 1;

  const charColors = character?.is_npc || !character?.user_colors?.length ? ["#737373"] : character.user_colors;
  const isCharMulti = !character?.is_npc && charColors.length > 1;
  const charGradientCss = character?.is_npc ? "#52525b" : (isCharMulti ? `linear-gradient(135deg, ${charColors.join(", ")})` : charColors[0]);
  const charTextStyle = character?.is_npc ? { color: "inherit" } : (isCharMulti
    ? { backgroundImage: charGradientCss, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
    : { color: charColors[0] });

  const commentingChar = writerCharacters.find((c) => c.id === commentingAsCharacterId);
  const commentCharColors = commentingChar?.is_npc || !commentingChar?.user_colors?.length ? ["#737373"] : commentingChar.user_colors;
  const isCommentCharMulti = !commentingChar?.is_npc && commentCharColors.length > 1;
  const commentButtonGradient = commentingChar?.is_npc ? "#52525b" : (isCommentCharMulti ? `linear-gradient(135deg, ${commentCharColors.join(", ")})` : commentCharColors[0]);

  const replyingChar = writerCharacters.find((c) => c.id === replyingAsCharacterId);

  const renderAkaFormatted = (text: string) => {
    if (!text.trim()) return <span>{character?.name}</span>;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const content = part.slice(2, -2);
        return (
          <strong key={idx} style={!character?.is_npc ? charTextStyle : {}}>
            {content}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
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

  const handleUpdateAvatar = async (urlToSave: string) => {
    if (!character || !urlToSave.trim()) return;

    const { error } = await supabase
      .from("characters")
      .update({ avatar_url: urlToSave })
      .eq("id", character.id);

    if (!error) {
      setCharacter((prev) => prev ? { ...prev, avatar_url: urlToSave } : null);
      setAvatarUrl(urlToSave);
      setIsAvatarModalOpen(false);
      setNewAvatarUrl("");
    }
  };

  const handleQuickFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !character) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${character.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("characters")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("characters")
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      await handleUpdateAvatar(publicUrlData.publicUrl);
    }
    setUploading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!character || !user) return;
    if (!name.trim()) {
      alert("Character name is required.");
      return;
    }

    try {
      setUploadingImage(true);
      const cleanHandle = (handle.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const payload = {
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
        bio: bio.trim() || null,
        followers_count: customFollowers ? parseInt(customFollowers, 10) : character.followers_count || 0,
        following_count: customFollowing ? parseInt(customFollowing, 10) : character.following_count || 0,
        is_verified: isVerified,
        is_brand: isBrand,
        is_npc: isNpc,
        npc_tag: isNpc ? npcCategories.trim() : null,
        npc_behavior: isNpc ? npcBehavior : "manual",
      };

      const { data, error } = await supabase
        .from("characters")
        .update(payload)
        .eq("id", character.id)
        .select()
        .single();

      if (error) throw error;

      setCharacter(data);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteCharacter = async () => {
    if (!character || !confirm("Are you sure you want to delete this character?")) return;
    const { error } = await supabase.from("characters").delete().eq("id", character.id);
    if (!error) {
      router.push("/phone");
    } else {
      alert("Error deleting character: " + error.message);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!character || !user) return;

    try {
      setPublishingPost(true);
      const followers = character.followers_count || 100;
      const calcLikes = Math.floor(followers * (0.2 + Math.random() * 0.2));
      const calcComments = 0;

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

      const hasTagOrMention = postImages.length > 0 || postCaption.includes("@");

      const payload = {
        character_id: postingAsCharacterId || character.id,
        user_id: user.id,
        post_type: postType,
        content: postCaption || null,
        images: postImages.length > 0 ? postImages : null,
        video_url: postVideos.length > 0 ? postVideos[0] : null,
        audio_url: postAudioUrl || null,
        stream_title: streamTitle || null,
        stream_viewers: streamViewers ? parseInt(streamViewers, 10) : null,
        location: postLocation || null,
        mention_relation: hasTagOrMention ? mentionRelation : null,
        song: formattedSong,
        poll: formattedPoll,
        behind_the_story: behindTheStory || null,
        likes_count: calcLikes,
        comments_count: calcComments,
        comments: [],
        liked_by: [],
        is_draft: false,
        created_at: new Date().toISOString(),
      };

      if (editingPostId) {
        const { error } = await supabase
          .from("posts")
          .update({
            content: payload.content,
            images: payload.images,
            video_url: payload.video_url,
            audio_url: payload.audio_url,
            stream_title: payload.stream_title,
            stream_viewers: payload.stream_viewers,
            location: payload.location,
            mention_relation: payload.mention_relation,
            song: payload.song,
            poll: payload.poll,
            behind_the_story: payload.behind_the_story,
          })
          .eq("id", editingPostId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw error;
      }

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("character_id", character.id)
        .eq("is_draft", false)
        .order("created_at", { ascending: false });

      setPosts(postData || []);
      setPostsCount(postData?.length || 0);
      setIsNewPostModalOpen(false);
      setEditingPostId(null);

      setPostCaption("");
      setPostImages([]);
      setPostVideos([]);
      setPostAudioUrl("");
      setStreamTitle("");
      setStreamViewers("");
      setPostLocation("");
      setMentionRelation("friend");
      setShowPollConfig(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowSongConfig(false);
      setSongTitle("");
      setSongArtist("");
      setSongLink("");
      setBehindTheStory("");
    } catch (err: any) {
      alert("Error publishing post: " + err.message);
    } finally {
      setPublishingPost(false);
    }
  };

  const toggleFollow = async () => {
    if (!user || !character || isOwner) return;

    if (isFollowing) {
      await supabase.from("character_follows").delete().eq("follower_id", user.id).eq("character_id", character.id);
      const newCount = Math.max(0, (character.followers_count || 1) - 1);
      await supabase.from("characters").update({ followers_count: newCount }).eq("id", character.id);
      setIsFollowing(false);
      setCharacter((prev) => prev ? { ...prev, followers_count: newCount } : null);
    } else {
      await supabase.from("character_follows").insert({ follower_id: user.id, character_id: character.id });
      const newCount = (character.followers_count || 0) + 1;
      await supabase.from("characters").update({ followers_count: newCount }).eq("id", character.id);
      setIsFollowing(true);
      setCharacter((prev) => prev ? { ...prev, followers_count: newCount } : null);

      if (character.user_id && character.user_id !== user?.id) {
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: character.user_id,
          title: "New Follower",
          body: `${user.email?.split("@")[0] || "Someone"} started following ${character.name}`,
          content: `${user.email?.split("@")[0] || "Someone"} started following ${character.name}`,
          category: "Activity",
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  };

  const openFollowsModal = async (type: "followers" | "following") => {
    if (!character) return;
    setFollowModalType(type);
    setLoadingFollows(true);

    if (type === "followers") {
      const { data: followsData, error } = await supabase
        .from("character_follows")
        .select("follower_id")
        .eq("character_id", character.id);

      if (error || !followsData || followsData.length === 0) {
        setFollowList([]);
        setLoadingFollows(false);
        return;
      }

      const followerIds = followsData.map((f: any) => f.follower_id).filter(Boolean);
      const { data: charsData } = await supabase
        .from("characters")
        .select("id, name, handle, avatar_url, is_verified, user_colors")
        .in("id", followerIds);

      setFollowList((charsData || []).map((c: any) => ({ characters: c })));
    } else {
      const { data: followsData, error } = await supabase
        .from("character_follows")
        .select("character_id")
        .eq("follower_id", character.id);

      if (error || !followsData || followsData.length === 0) {
        setFollowList([]);
        setLoadingFollows(false);
        return;
      }

      const followingIds = followsData.map((f: any) => f.character_id).filter(Boolean);
      const { data: charsData } = await supabase
        .from("characters")
        .select("id, name, handle, avatar_url, is_verified, user_colors")
        .in("id", followingIds);

      setFollowList((charsData || []).map((c: any) => ({ characters: c })));
    }
    setLoadingFollows(false);
  };

const toggleWriterCharacterFollow = async (charId: string) => {
    if (!character || !user) return;
    const isCurrentlyFollowing = writerFollowStatusMap[charId];
    const newFollowState = !isCurrentlyFollowing;
    const followerChar = writerCharacters.find((c) => c.id === charId);

    if (isCurrentlyFollowing) {
      const { error: delError } = await supabase
        .from("character_follows")
        .delete()
        .eq("follower_id", charId)
        .eq("character_id", character.id);

      if (delError) {
        console.error("Error removing follow:", delError.message);
        alert("Failed to unfollow: " + delError.message);
        return;
      }
    } else {
      const { error: insError } = await supabase
        .from("character_follows")
        .insert({ follower_id: charId, character_id: character.id });

      if (insError) {
        console.error("Error adding follow:", insError.message);
        alert("Failed to follow: " + insError.message);
        return;
      }

      // Send activity notification to character owner if not self-following
      if (character.user_id && character.user_id !== user.id) {
        const notifText = `${followerChar?.name || "A character"} started following ${character.name}`;
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: character.user_id,
          type: "follow",
          title: "New Follower",
          body: notifText,
          content: notifText,
          avatar_url: followerChar?.avatar_url || null, // ✅ Passes character avatar
          category: "Activity",
          is_read: false,
          created_at: new Date().toISOString(),
        });

        if (notifError) {
          console.error("Failed to create notification:", notifError.message);
        }
      }
    }

    setWriterFollowStatusMap((prev) => ({ ...prev, [charId]: newFollowState }));

    const updatedFollowCount = Math.max(
      0,
      (character.followers_count || 0) + (newFollowState ? 1 : -1)
    );

    // Update local state instantly; DB trigger handles the secure table update
    setCharacter((prev) => (prev ? { ...prev, followers_count: updatedFollowCount } : null));
    
    if (followModalType === "followers") {
      openFollowsModal("followers");
    }
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

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#f45b95] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="w-full p-12 text-center text-neutral-400 font-semibold">
        Character profile not found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 font-sans pb-24 text-neutral-900 dark:text-white px-2 sm:px-0 overflow-x-hidden">
      
      {/* BANNER & HEADER */}
      <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[24px] p-4 shadow-sm flex flex-col gap-3 overflow-visible relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center shrink-0">
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">
                  {character.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:scale-105 transition"
              >
                <Camera size={11} />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                <span>{character.name}</span>
              </h1>
              
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span style={!character.is_npc ? charTextStyle : { color: "inherit" }}>
                  @{character.handle || character.name}
                </span>
                {character.is_verified && (
                  <img src="/verify-2.png" alt="Verified" className="w-4 h-4 object-contain drop-shadow-sm" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <div className="flex flex-col items-center">
                <strong className="text-sm sm:text-base font-black">{formatCount(postsCount)}</strong>
                <span className="text-neutral-400 text-[11px] font-medium">posts</span>
              </div>
              <button
                type="button"
                onClick={() => openFollowsModal("followers")}
                className="flex flex-col items-center hover:opacity-85 transition text-left"
              >
                <strong className="text-sm sm:text-base font-black">{formatCount(character.followers_count || 0)}</strong>
                <span className="text-neutral-400 text-[11px] font-medium">followers</span>
              </button>
              <button
                type="button"
                onClick={() => openFollowsModal("following")}
                className="flex flex-col items-center hover:opacity-85 transition text-left"
              >
                <strong className="text-sm sm:text-base font-black">{formatCount(character.following_count || 0)}</strong>
                <span className="text-neutral-400 text-[11px] font-medium">following</span>
              </button>
            </div>
          </div>

          {/* BANNER ACTION BUTTONS (Strictly 2 buttons for non-owners) */}
          <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            {isOwner ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsManageFollowsOpen((prev) => !prev)}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center border border-neutral-300/60 dark:border-neutral-800 transition shadow-sm"
                    title="Manage Follows"
                  >
                    <Users size={14} className="text-neutral-700 dark:text-neutral-200" />
                  </button>

                  {isManageFollowsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col z-50 text-xs text-neutral-900 dark:text-white">
                      <div className="px-3 py-1 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                        Writer Characters
                      </div>
                      {writerCharacters.map((char) => {
                        const isFollowing = writerFollowStatusMap[char.id];
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => toggleWriterCharacterFollow(char.id)}
                            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/10 transition font-bold group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                                {char.avatar_url && <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="truncate">
                                {isFollowing ? `${char.name} follows (unfollow)` : `Follow as ${char.name}`}
                              </span>
                            </div>
                            {isFollowing && <Check size={13} className="text-[#f45b95] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-md transition hover:scale-105"
                  style={{ background: charGradientCss }}
                  title="New Post"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300/60 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 shadow-sm transition"
                  title="Edit Character Profile"
                >
                  <MoreHorizontal size={15} />
                </button>
              </>
            ) : (
              <>
                {/* Non-owner: Exactly 2 buttons (Follow dropdown + Message) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsManageFollowsOpen((prev) => !prev)}
                    className={`h-8 px-3.5 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition hover:scale-105 text-xs font-bold ${
                      isFollowing ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-white"
                    }`}
                    style={!isFollowing ? { background: charGradientCss } : {}}
                    title="Follow as character"
                  >
                    {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                    <span>{isFollowing ? "Following" : "Follow"}</span>
                  </button>

                  {isManageFollowsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col z-50 text-xs text-neutral-900 dark:text-white">
                      <div className="px-3 py-1 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                        Follow as your character
                      </div>
                      {writerCharacters.map((char) => {
                        const isFollowingChar = writerFollowStatusMap[char.id];
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => toggleWriterCharacterFollow(char.id)}
                            className="flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/10 transition font-bold group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                                {char.avatar_url && <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="truncate">
                                {isFollowingChar ? `${char.name} (unfollow)` : `Follow as ${char.name}`}
                              </span>
                            </div>
                            {isFollowingChar && <Check size={13} className="text-[#f45b95] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/messages?user=${character.user_id}`)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 flex items-center justify-center border border-neutral-300/60 dark:border-neutral-800 transition"
                  title="Message"
                >
                  <MessageCircle size={14} className="text-neutral-700 dark:text-neutral-200" />
                </button>
              </>
            )}
          </div>
        </div>

        {character.tagline && (
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 pt-1 text-left pl-0">
            {character.tagline}
          </p>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="grid grid-cols-6 w-full border-b border-neutral-200 dark:border-neutral-800 px-2 overflow-x-hidden">
        {(
          [
            { name: "Posts", icon: Grid },
            { name: "Tagged", icon: Tag },
            { name: "Episodes", icon: Film },
            { name: "Connections", icon: Users },
            { name: "Events", icon: Calendar },
            { name: "Profile", icon: FileText },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name as CharacterTab)}
              className={`flex items-center justify-center py-3 transition-all relative ${
                isActive ? "" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              }`}
              style={isActive ? charTextStyle : {}}
              title={tab.name}
            >
              <Icon size={18} />
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-[2.5px] rounded-t-full shadow-[0_-2px_8px_rgba(244,91,149,0.5)]" style={{ background: charGradientCss }} />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="w-full">
        {activeTab === "Posts" && (
          <div className="grid grid-cols-3 gap-0 overflow-hidden">
            {posts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[24px]">
                No posts published yet.
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  onClick={async () => {
                    setSelectedPost(post);
                    setActivePostImageIdx(0);
                    setIsSongPlaying(false);
                    const pid = post.id;
                    if (!postCommentsMap[pid]) {
                      const dbComments = post.comments && post.comments.length > 0 
                        ? post.comments 
                        : generateContextualComments(post);
                      setPostCommentsMap((prev) => ({
                        ...prev,
                        [pid]: dbComments
                      }));
                    }
                    if (!postLikedByMap[pid]) {
                      const dbLikedBy = post.liked_by || [];
                      setPostLikedByMap((prev) => ({
                        ...prev,
                        [pid]: dbLikedBy
                      }));
                    }
                  }}
                  className="group relative aspect-square overflow-hidden bg-neutral-900 border-none shadow-none cursor-pointer rounded-none"
                >
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0]} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : post.image_url ? (
                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : post.video_url ? (
                    <video src={post.video_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full p-3 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-200 text-xs font-semibold text-center line-clamp-4">
                      {post.content}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 text-white font-black text-xs">
                    <div className="flex items-center gap-1">
                      <Heart size={15} className="fill-white" />
                      <span>{formatCount(post.likes_count || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={15} className="fill-white" />
                      <span>{formatCount(post.comments_count || (post.comments?.length || 0))}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Tagged" && (
          <div className="grid grid-cols-3 gap-0 overflow-hidden">
            {taggedPosts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[24px]">
                No tagged posts yet.
              </div>
            ) : (
              taggedPosts.map((post) => (
                <div key={post.id} className="group relative aspect-square overflow-hidden bg-neutral-900 border-none shadow-none cursor-pointer rounded-none">
                  <img src={post.images?.[0]} alt="Tagged" className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Episodes" && (
          <div className="py-16 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[24px]">
            No active episodes found.
          </div>
        )}

        {activeTab === "Connections" && (
          <div className="py-16 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[24px]">
            No connections established yet.
          </div>
        )}

        {activeTab === "Events" && (
          <div className="py-16 text-center text-neutral-400 text-xs font-bold border border-dashed border-neutral-300 dark:border-neutral-800 rounded-[24px]">
            No upcoming events.
          </div>
        )}

        {activeTab === "Profile" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 rounded-[24px] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-white/10 shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest" style={!character.is_npc ? charTextStyle : { color: "inherit" }}>
                  Character Dossier
                </span>
                <h2 className="text-sm font-black italic tracking-wide text-neutral-900 dark:text-white">
                  AKA &ldquo;{renderAkaFormatted(character.aka_line || character.tagline || character.name)}&rdquo;
                </h2>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsPapersModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-white shadow transition"
                  style={{ background: charGradientCss }}
                >
                  <FileSpreadsheet size={13} />
                  <span>Please fill out these papers</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* INSTAGRAM POST DETAIL MODAL (Seamless scrollbar)                   */}
      {/* ================================================================= */}
      {selectedPost && (() => {
        const currentPostId = selectedPost.id;
        const currentLikes = selectedPost.likes_count || 0;
        const likedChars = postLikedByMap[currentPostId] || selectedPost.liked_by || [];
        const isLikedByAny = likedChars.length > 0;
        
        const displayedComments = postCommentsMap[currentPostId] || selectedPost.comments || [];

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#13141b] text-neutral-900 dark:text-white rounded-[28px] border-none shadow-2xl flex flex-col text-sm">
              
              {/* Modal Header */}
              <div className="flex flex-col p-4 border-b border-neutral-200 dark:border-white/10 gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => {
                        setSelectedPost(null);
                        router.push(`/phone/${character.id}`);
                      }}
                      className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border-2 border-[#f45b95] shrink-0 cursor-pointer hover:opacity-90"
                    >
                      {character.avatar_url && <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => {
                            setSelectedPost(null);
                            router.push(`/phone/${character.id}`);
                          }}
                          className="font-black text-sm cursor-pointer hover:underline"
                        >
                          @{character.handle || character.name}
                        </span>
                        {character.is_verified && <img src="/verify-2.png" alt="" className="w-4 h-4 object-contain" />}
                        <span className="text-neutral-400 text-xs">· {timeAgo(selectedPost.created_at)}</span>
                      </div>

                      {selectedPost.location && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          <MapPin size={12} className="text-neutral-400" />
                          <span>{selectedPost.location}</span>
                        </div>
                      )}

                      {selectedPost.song && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          <Music size={12} className="text-[#f45b95]" />
                          <span>{selectedPost.song.title} · {selectedPost.song.artist}</span>
                          <button
                            type="button"
                            onClick={() => setIsSongPlaying((prev) => !prev)}
                            className="ml-1 text-neutral-400 hover:text-white transition"
                          >
                            {isSongPlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostId(selectedPost.id);
                          setPostType(selectedPost.post_type || "text");
                          setPostCaption(selectedPost.content || "");
                          setPostImages(selectedPost.images || []);
                          setPostVideos(selectedPost.video_url ? [selectedPost.video_url] : []);
                          setPostAudioUrl(selectedPost.audio_url || "");
                          setStreamTitle(selectedPost.stream_title || "");
                          setStreamViewers(selectedPost.stream_viewers ? String(selectedPost.stream_viewers) : "");
                          setPostLocation(selectedPost.location || "");
                          setSelectedPost(null);
                          setIsNewPostModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                        title="Edit Post"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPost(null);
                        setIsCommentingCharacterDropdownOpen(false);
                        setReplyingCharacterDropdownOpen(false);
                        setReplyingToCommentId(null);
                        setIsLikeMenuOpen(false);
                      }}
                      className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Post Media Carousel */}
              <div className="relative w-full aspect-square shrink-0 bg-black flex items-center justify-center overflow-hidden">
                {(() => {
                  const images = getPostImages(selectedPost);
                  if (images.length > 0) {
                    return (
                      <>
                        <img
                          src={images[activePostImageIdx] || images[0]}
                          alt="Post media"
                          className="w-full h-full object-cover"
                        />

                        {images.length > 1 && (
                          <>
                            {activePostImageIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => setActivePostImageIdx((prev) => prev - 1)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 hover:scale-110 transition"
                              >
                                <ChevronLeft size={18} />
                              </button>
                            )}
                            {activePostImageIdx < images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => setActivePostImageIdx((prev) => prev + 1)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 hover:scale-110 transition"
                              >
                                <ChevronRight size={18} />
                              </button>
                            )}

                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                              {images.map((_: any, idx: number) => (
                                <span
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    idx === activePostImageIdx ? "bg-[#f45b95] w-3" : "bg-white/50"
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  } else if (selectedPost.video_url) {
                    return (
                      <video 
                        src={selectedPost.video_url} 
                        controls 
                        playsInline
                        className="w-full h-full object-cover" 
                      />
                    );
                  } else {
                    return <div className="p-8 text-center text-sm font-semibold">{selectedPost.content}</div>;
                  }
                })()}
              </div>

              {/* Action Bar */}
              <div className="p-4 flex flex-col gap-2 border-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLikeMenuOpen((prev) => !prev)}
                        className="hover:text-rose-500 transition"
                        title="Like as character"
                      >
                        <Heart size={21} className={isLikedByAny ? "fill-rose-500 text-rose-500" : "text-neutral-700 dark:text-neutral-300"} />
                      </button>

                      {isLikeMenuOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/20 rounded-2xl shadow-2xl py-2 flex flex-col z-50 text-sm">
                          <div className="px-3.5 py-1 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                            Like as character
                          </div>
                          {writerCharacters.map((char) => {
                            const isCharLiked = likedChars.some((c: any) => c.name === char.name);
                            return (
                              <button
                                key={char.id}
                                type="button"
                                onClick={async () => {
                                  let updatedLikedBy = [...likedChars];
                                  if (isCharLiked) {
                                    updatedLikedBy = updatedLikedBy.filter((c: any) => c.name !== char.name);
                                  } else {
                                    const charCols = char.user_colors || ["#f45b95"];
                                    const isMulti = charCols.length > 1;
                                    const grad = isMulti ? `linear-gradient(135deg, ${charCols.join(", ")})` : charCols[0];
                                    updatedLikedBy.unshift({
                                      id: char.id,
                                      name: char.name,
                                      handle: char.handle || char.name,
                                      avatar_url: char.avatar_url,
                                      colors: charCols,
                                      isGradient: isMulti,
                                      gradient: grad
                                    });

                                    if (character.user_id && character.user_id !== user?.id) {
                                      await supabase.from("notifications").insert({
                                        user_id: character.user_id,
                                        type: "like",
                                        title: "New Like",
                                        body: `${char.name} liked a post by ${character.name}`,
                                        content: `${char.name} liked a post by ${character.name}`,
                                        avatar_url: char.avatar_url || null, // ✅ Passes character avatar
                                        category: "Activity",
                                        is_read: false,
                                        created_at: new Date().toISOString()
                                      });
                                    }
                                  }

                                  setPostLikedByMap((prev) => ({
                                    ...prev,
                                    [currentPostId]: updatedLikedBy
                                  }));

                                  const newLikesCount = Math.max(0, currentLikes + (isCharLiked ? -1 : 1));

                                  setSelectedPost((prev: any) => ({
                                    ...prev,
                                    likes_count: newLikesCount,
                                    liked_by: updatedLikedBy
                                  }));

                                  setPosts((prev) =>
                                    prev.map((p) => (p.id === currentPostId ? { ...p, likes_count: newLikesCount, liked_by: updatedLikedBy } : p))
                                  );

                                  await supabase
                                    .from("posts")
                                    .update({
                                      likes_count: newLikesCount,
                                      liked_by: updatedLikedBy
                                    })
                                    .eq("id", currentPostId);

                                  setIsLikeMenuOpen(false);
                                }}
                                className="flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-white/10 font-bold transition"
                              >
                                <span className="truncate">Like as {char.name}</span>
                                <Heart size={14} className={isCharLiked ? "text-rose-500 fill-rose-500 shrink-0" : "text-neutral-400 shrink-0"} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <MessageCircle size={21} className="hover:text-[#f45b95] cursor-pointer transition" />
                    
                    <button
                      type="button"
                      title="Copy link to post"
                      onClick={() => {
                        const link = `${window.location.origin}/phone/${character.id}`;
                        navigator.clipboard.writeText(link);
                        alert("Post link copied to clipboard!");
                      }}
                    >
                      <Share2 size={21} className="hover:text-[#f45b95] cursor-pointer transition" />
                    </button>
                  </div>
                </div>

                <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                  {likedChars.length > 0 ? (
                    <span>
                      Liked by{" "}
                      {likedChars.slice(0, 3).map((c: any, idx: number, arr: any[]) => {
                        const style = c.isGradient
                          ? { backgroundImage: c.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                          : { color: c.gradient };
                        return (
                          <React.Fragment key={idx}>
                            <strong 
                              style={style} 
                              className="cursor-pointer hover:underline"
                              onClick={() => {
                                if (c.id) {
                                  setSelectedPost(null);
                                  router.push(`/phone/${c.id}`);
                                }
                              }}
                            >
                              {c.handle}
                            </strong>
                            {idx < arr.length - 1 && ", "}
                          </React.Fragment>
                        );
                      })}{" "}
                      {likedChars.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setIsAllLikesModalOpen(true)}
                          className="hover:underline font-bold inline text-neutral-900 dark:text-white"
                        >
                          and {formatCount(currentLikes + likedChars.length - 3)} others
                        </button>
                      )}
                      {likedChars.length <= 3 && currentLikes > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAllLikesModalOpen(true)}
                          className="hover:underline font-bold inline text-neutral-900 dark:text-white"
                        >
                          and {formatCount(currentLikes)} others
                        </button>
                      )}
                    </span>
                  ) : (
                    <span>{formatCount(currentLikes)} likes</span>
                  )}
                </div>

                {selectedPost.content && (
                  <p className="text-sm text-neutral-800 dark:text-neutral-200">
                    <strong 
                      className="mr-2 font-bold cursor-pointer hover:underline"
                      onClick={() => {
                        setSelectedPost(null);
                        router.push(`/phone/${character.id}`);
                      }}
                    >
                      @{character.handle || character.name}
                    </strong>
                    {selectedPost.content}
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCommentingCharacterDropdownOpen((prev) => !prev)}
                        className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 shrink-0 border border-neutral-300 dark:border-white/20 hover:scale-105 transition"
                      >
                        {commentingChar?.avatar_url ? (
                          <img src={commentingChar.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-white text-xs">?</span>
                        )}
                      </button>

                      {isCommentingCharacterDropdownOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/20 rounded-2xl shadow-2xl py-2 flex flex-col z-50 text-sm">
                          <div className="px-3.5 py-1 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                            Comment as
                          </div>
                          {writerCharacters.map((char) => (
                            <button
                              key={char.id}
                              type="button"
                              onClick={() => {
                                setCommentingAsCharacterId(char.id);
                                setIsCommentingCharacterDropdownOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-white/10 font-bold transition"
                            >
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                                {char.avatar_url && <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="truncate">{char.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={postCommentInput}
                      onChange={(e) => setPostCommentInput(e.target.value)}
                      placeholder={`Comment as ${commentingChar?.name || "Character"}...`}
                      className="flex-1 bg-transparent border-none text-sm text-neutral-900 dark:text-white outline-none px-2"
                    />

                    <button
                      type="button"
                      onClick={async () => {
                        if (!postCommentInput.trim()) return;
                        const newComment = {
                          id: Date.now(),
                          character_id: commentingChar?.id,
                          name: `@${commentingChar?.handle || commentingChar?.name || "writer"}`,
                          text: postCommentInput.trim(),
                          time: postCommentDate ? new Date(postCommentDate).toLocaleDateString() : "now",
                          likes: Math.floor(Math.random() * 50) + 1,
                          isChar: true,
                          color: commentingChar?.is_npc ? undefined : (commentingChar?.user_colors?.[0] || "#f45b95"),
                          verified: commentingChar?.is_verified,
                          avatar: commentingChar?.avatar_url,
                        };
                        const updatedComments = [newComment, ...displayedComments];
                        
                        setPostCommentsMap((prev) => ({
                          ...prev,
                          [currentPostId]: updatedComments
                        }));

                        await supabase
                          .from("posts")
                          .update({ 
                            comments: updatedComments,
                            comments_count: updatedComments.length 
                          })
                          .eq("id", currentPostId);

                        if (character.user_id && character.user_id !== user?.id) {
                          await supabase.from("notifications").insert({
                            user_id: character.user_id,
                            type: "comment",
                            title: "New Comment",
                            body: `${commentingChar?.name || "Someone"} commented on a post by ${character.name}`,
                            content: `${commentingChar?.name || "Someone"} commented on a post by ${character.name}`,
                            avatar_url: commentingChar?.avatar_url || null, // ✅ Passes character avatar
                            category: "Activity",
                            is_read: false,
                            created_at: new Date().toISOString()
                          });
                        }

                        setPostCommentInput("");
                        setPostCommentDate("");
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-white transition shadow-sm text-xs"
                      style={{ background: commentButtonGradient }}
                    >
                      Post
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-white/10 text-xs">
                    <span className="text-neutral-400">Match older date:</span>
                    <input
                      type="datetime-local"
                      min={selectedPost.created_at ? new Date(selectedPost.created_at).toISOString().slice(0, 16) : undefined}
                      value={postCommentDate}
                      onChange={(e) => {
                        const postTime = new Date(selectedPost.created_at).getTime();
                        const chosenTime = new Date(e.target.value).getTime();
                        if (chosenTime < postTime) {
                          alert("Comments cannot be dated before the post was made.");
                          return;
                        }
                        setPostCommentDate(e.target.value);
                      }}
                      className="bg-neutral-200 dark:bg-black/40 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Comment List */}
                <div className="flex flex-col gap-3.5 pt-1">
                  {displayedComments.length === 0 ? (
                    <div className="py-8 text-center text-neutral-400 text-xs font-bold">
                      No comments yet.
                    </div>
                  ) : (
                    displayedComments.map((comment: any, i: number) => {
                      const cid = comment.id || i;
                      const isReplyingHere = replyingToCommentId === cid;
                      return (
                        <div key={cid} className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3.5">
                            <div className="flex items-start gap-3 w-full min-w-0">
                              <div 
                                onClick={() => {
                                  if (comment.character_id) {
                                    setSelectedPost(null);
                                    router.push(`/phone/${comment.character_id}`);
                                  }
                                }}
                                className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 border border-neutral-300 dark:border-white/25 cursor-pointer hover:opacity-90"
                              >
                                {comment.avatar ? (
                                  <img src={comment.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  comment.name.charAt(1).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="flex items-start gap-1.5 flex-wrap">
                                  <strong 
                                    style={comment.color ? { color: comment.color } : {}}
                                    className="cursor-pointer hover:underline font-bold text-sm shrink-0"
                                    onClick={() => {
                                      if (comment.character_id) {
                                        setSelectedPost(null);
                                        router.push(`/phone/${comment.character_id}`);
                                      }
                                    }}
                                  >
                                    {comment.name}
                                  </strong>
                                  {comment.verified && <img src="/verify-2.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0 mt-0.5" />}
                                  <span className="font-normal text-neutral-700 dark:text-neutral-200 text-sm break-words">
                                    {comment.text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-400 font-semibold mt-0.5">
                                  <span>{comment.time}</span>
                                  <span>{comment.likes} likes</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingToCommentId(isReplyingHere ? null : cid);
                                      setReplyingCharacterDropdownOpen(false);
                                    }}
                                    className="hover:text-neutral-900 dark:hover:text-white font-bold"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                            <Heart size={13} className="text-neutral-400 hover:text-rose-500 cursor-pointer shrink-0 mt-1" />
                          </div>

                          {/* Independent Reply Box & Avatar Pop-up */}
                          {isReplyingHere && (
                            <div className="ml-11 flex flex-col gap-2 p-3 rounded-2xl bg-neutral-100 dark:bg-[#1a1c26] border border-neutral-200 dark:border-white/10">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingCharacterDropdownOpen((prev) => !prev)}
                                    className="w-7 h-7 rounded-full overflow-hidden bg-neutral-700 shrink-0 border border-neutral-300 dark:border-white/20 hover:scale-105 transition"
                                  >
                                    {replyingChar?.avatar_url ? (
                                      <img src={replyingChar.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="w-full h-full flex items-center justify-center font-bold text-white text-xs">?</span>
                                    )}
                                  </button>

                                  {replyingCharacterDropdownOpen && (
                                    <div className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/20 rounded-2xl shadow-2xl py-2 flex flex-col z-50 text-sm">
                                      <div className="px-3.5 py-1 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                                        Reply as
                                      </div>
                                      {writerCharacters.map((char) => (
                                        <button
                                          key={char.id}
                                          type="button"
                                          onClick={() => {
                                            setReplyingAsCharacterId(char.id);
                                            setReplyingCharacterDropdownOpen(false);
                                          }}
                                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-white/10 font-bold transition"
                                        >
                                          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                                            {char.avatar_url && <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />}
                                          </div>
                                          <span className="truncate">{char.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={replyInput}
                                  onChange={(e) => setReplyInput(e.target.value)}
                                  placeholder={`Reply as ${replyingChar?.name || "Character"}...`}
                                  className="flex-1 bg-transparent border-none text-xs text-neutral-900 dark:text-white outline-none px-2"
                                />

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!replyInput.trim()) return;
                                    const newReply = {
                                      id: Date.now(),
                                      character_id: replyingChar?.id,
                                      name: `@${replyingChar?.handle || replyingChar?.name || "writer"}`,
                                      text: replyInput.trim(),
                                      time: replyDate ? new Date(replyDate).toLocaleDateString() : "now",
                                      likes: Math.floor(Math.random() * 20) + 1,
                                      isChar: true,
                                      color: replyingChar?.is_npc ? undefined : (replyingChar?.user_colors?.[0] || "#f45b95"),
                                      verified: replyingChar?.is_verified,
                                      avatar: replyingChar?.avatar_url,
                                    };
                                    const updatedComments = [newReply, ...displayedComments];
                                    setPostCommentsMap((prev) => ({
                                      ...prev,
                                      [currentPostId]: updatedComments
                                    }));

                                    await supabase
                                      .from("posts")
                                      .update({ 
                                        comments: updatedComments,
                                        comments_count: updatedComments.length 
                                      })
                                      .eq("id", currentPostId);

                                    setReplyInput("");
                                    setReplyDate("");
                                    setReplyingToCommentId(null);
                                  }}
                                  className="px-3 py-1.5 rounded-full font-bold text-white text-xs shadow-sm transition"
                                  style={{ background: commentButtonGradient }}
                                >
                                  Reply
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-white/10 text-[11px]">
                                <span className="text-neutral-400">Reply date:</span>
                                <input
                                  type="datetime-local"
                                  min={selectedPost.created_at ? new Date(selectedPost.created_at).toISOString().slice(0, 16) : undefined}
                                  value={replyDate}
                                  onChange={(e) => {
                                    const postTime = new Date(selectedPost.created_at).getTime();
                                    const chosenTime = new Date(e.target.value).getTime();
                                    if (chosenTime < postTime) {
                                      alert("Replies cannot be dated before the post was made.");
                                      return;
                                    }
                                    setReplyDate(e.target.value);
                                  }}
                                  className="bg-neutral-200 dark:bg-black/40 rounded-lg px-2 py-0.5 text-[11px] text-neutral-900 dark:text-white outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* ALL LIKES POP-UP MODAL (Seamless scrollbar) */}
      {isAllLikesModalOpen && (() => {
        const modalLikedChars = selectedPost ? (postLikedByMap[selectedPost.id] || selectedPost.liked_by || []) : [];
        return (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-black uppercase tracking-wider" style={!character.is_npc ? charTextStyle : {}}>
                  Liked by
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsAllLikesModalOpen(false)} 
                  className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {modalLikedChars.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-xs font-bold">No likes recorded.</div>
                ) : (
                  modalLikedChars.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700">
                      <div className="flex items-center gap-3.5 truncate">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                          {c.avatar_url && <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold truncate">
                            {c.name}
                          </span>
                          <span className="text-xs text-neutral-400 truncate">@{c.handle}</span>
                        </div>
                      </div>
                      {c.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAllLikesModalOpen(false);
                            setSelectedPost(null);
                            router.push(`/phone/${c.id}`);
                          }}
                          className="px-4 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-bold hover:opacity-80"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* NEW POST MODAL */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#16171f] text-neutral-900 dark:text-white rounded-[28px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-4 border border-neutral-200 dark:border-white/10">
            
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/10">
              <h3 className="text-sm font-black uppercase tracking-wider">
                {editingPostId ? "Edit Post" : "New Post"}
              </h3>
              <button type="button" onClick={() => { setIsNewPostModalOpen(false); setEditingPostId(null); }} className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handlePublishPost} className="flex flex-col gap-4">
              
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

              {(postType === "photo" || postType === "video") && (
                <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      {postType === "photo" ? "Add Photos (Multiple allowed)" : "Add Videos (Multiple allowed)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPostMediaModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition hover:scale-105 flex items-center gap-1.5"
                      style={{ background: charGradientCss }}
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
                            >
                              <ArrowLeft size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === postImages.length - 1}
                              onClick={() => movePhoto(idx, "right")}
                              className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-white/10 disabled:opacity-30 flex items-center justify-center text-xs"
                            >
                              <ArrowRight size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
                              className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center text-xs ml-1"
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

              {/* Caption with @mention Autocomplete */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">What&apos;s happening? (Type @ to mention)</label>
                <textarea
                  rows={3}
                  value={postCaption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostCaption(val);

                    const lastAtIndex = val.lastIndexOf("@");
                    if (lastAtIndex !== -1 && (lastAtIndex === 0 || val[lastAtIndex - 1] === " ")) {
                      const query = val.slice(lastAtIndex + 1).toLowerCase();
                      const filtered = allPlatformChars.filter(c => 
                        (c.handle || "").toLowerCase().includes(query) || 
                        (c.name || "").toLowerCase().includes(query)
                      );
                      setMentionSuggestions(filtered);
                      setShowMentionDropdown(filtered.length > 0);
                    } else {
                      setShowMentionDropdown(false);
                    }
                  }}
                  placeholder="Write a caption... (e.g. @username hanging out)"
                  className="w-full p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-none focus:border-[#f45b95]"
                />

                {/* Autocomplete Dropdown */}
                {showMentionDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-full max-h-40 overflow-y-auto bg-white dark:bg-[#1a1c26] border border-neutral-200 dark:border-white/15 rounded-xl shadow-2xl z-50 py-1">
                    {mentionSuggestions.map((char) => (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => {
                          const lastAtIndex = postCaption.lastIndexOf("@");
                          const base = postCaption.slice(0, lastAtIndex);
                          setPostCaption(`${base}@${char.handle || char.name} `);
                          setShowMentionDropdown(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-white/10 text-xs font-bold transition"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                          {char.avatar_url && <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="truncate">{char.name} <span className="text-neutral-400">@{char.handle}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conditional Tag / Mention Relation Selector (Only shows if photo attached or @ mention used) */}
              {(postImages.length > 0 || postCaption.includes("@")) && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Mention / Tag Relation (Prompts comments)</label>
                  <select
                    value={mentionRelation}
                    onChange={(e) => setMentionRelation(e.target.value)}
                    className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-bold outline-none focus:border-[#f45b95]"
                  >
                    <option value="friend">Friend / Ally</option>
                    <option value="best_friend">Best Friend / Co-sign</option>
                    <option value="ex">Ex / Past Flame</option>
                    <option value="rival">Rival / Frenemy</option>
                    <option value="family">Family</option>
                  </select>
                </div>
              )}

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
                  onClick={() => { setIsNewPostModalOpen(false); setEditingPostId(null); }}
                  className="px-5 py-2.5 rounded-full bg-neutral-200 dark:bg-[#1e2029] border border-neutral-300 dark:border-white/10 hover:bg-neutral-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishingPost}
                  className="px-6 py-2.5 rounded-full text-white font-black shadow-md transition"
                  style={{ background: charGradientCss }}
                >
                  {publishingPost ? (editingPostId ? "Updating..." : "Posting...") : (editingPostId ? "Save Changes" : "Post")}
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
                <button type="button" disabled={uploadingPostMedia} onClick={() => postMediaFileInputRef.current?.click()} className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold shadow-md transition" style={{ background: charGradientCss }}>
                  {uploadingPostMedia ? "Uploading..." : "Browse files"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="url" placeholder="https://..." value={postMediaInputUrl || ""} onChange={(e) => setPostMediaInputUrl(e.target.value)} className="w-full h-8 bg-neutral-100 dark:bg-[#191a21] border border-neutral-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none" />
                <button type="button" onClick={() => handleApplyPostMediaUrl(postMediaInputUrl)} className="w-full h-8 rounded-lg text-white text-[11px] font-bold" style={{ background: charGradientCss }}>Apply</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING POPUP MODAL (Seamless scrollbar) */}
      {followModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-black uppercase tracking-wider" style={!character.is_npc ? charTextStyle : {}}>
                {followModalType === "followers" ? "Followers" : "Following"}
              </h3>
              <button type="button" onClick={() => setFollowModalType(null)} className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {loadingFollows ? (
                <div className="py-8 text-center text-neutral-400 text-xs">Loading...</div>
              ) : followList.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs font-bold">No {followModalType} found.</div>
              ) : (
                followList.map((item: any, i: number) => {
                  const charObj = item.characters;
                  if (!charObj) return null;
                  return (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700">
                      <div className="flex items-center gap-3.5 truncate">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-700 shrink-0">
                          {charObj.avatar_url && <img src={charObj.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold truncate flex items-center gap-1.5">
                            {charObj.name}
                            {charObj.is_verified && <img src="/verify-2.png" alt="" className="w-4 h-4 object-contain" />}
                          </span>
                          <span className="text-xs text-neutral-400 truncate">@{charObj.handle || charObj.name}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/phone/${charObj.id}`)}
                        className="px-4 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-bold hover:opacity-80"
                      >
                        View
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CHARACTER EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-[#16171f] text-neutral-900 dark:text-white rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 border border-neutral-200 dark:border-white/10">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border-2 border-[#f45b95] shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-white font-black text-sm">?</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">edit character</span>
                  <h3 className="text-base font-black tracking-wide">Update {character.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteCharacter}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              
              {/* Image Upload Quick Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Avatar icon", target: "avatar" },
                  { label: "Portrait", target: "portrait" },
                  { label: "Thread icon", target: "thread" },
                  { label: "Profile banner", target: "cover" },
                ].map((item) => (
                  <div key={item.target} className="flex flex-col p-3 rounded-2xl bg-neutral-50 dark:bg-[#1c1e29] border border-neutral-200 dark:border-white/10 gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setImageModalTarget(item.target as any); setModalMode("upload"); }}
                        className="flex-1 py-1.5 rounded-xl bg-neutral-200 dark:bg-white/10 text-[10px] font-bold hover:bg-neutral-300 dark:hover:bg-white/20 transition"
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImageModalTarget(item.target as any); setModalMode("url"); }}
                        className="flex-1 py-1.5 rounded-xl bg-neutral-200 dark:bg-white/10 text-[10px] font-bold hover:bg-neutral-300 dark:hover:bg-white/20 transition"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-bold outline-none focus:border-[#f45b95]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Username</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-bold outline-none focus:border-[#f45b95]"
                  />
                </div>
              </div>

              {/* Color & Palette Picker with Preview Text */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-[#1c1e29] border border-neutral-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Color & Palette</span>
                  <div className="flex rounded-full bg-neutral-200 dark:bg-black/40 p-0.5 text-[10px] font-bold">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setColorCount(num as any)}
                        className={`px-3 py-1 rounded-full transition ${colorCount === num ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-400"}`}
                      >
                        {num} {num === 1 ? "color" : "colors"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_PALETTES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPalette(preset);
                        setColorCount(3);
                      }}
                      className="h-8 rounded-xl border border-white/20 transition hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${preset.join(", ")})` }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {palette.slice(0, colorCount).map((col, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={col}
                        onChange={(e) => {
                          const updated = [...palette];
                          updated[idx] = e.target.value;
                          setPalette(updated);
                        }}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-none"
                      />
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">{col}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-white/10 text-xs">
                  <span className="text-neutral-400 text-[10px] font-black uppercase tracking-wider block mb-1">Preview styling:</span>
                  <p className="font-semibold">
                    THEIR NAME: <strong className="font-bold">bold</strong>, <span className="italic">*an action*</span>, <span style={charTextStyle}>"dialogue sweeps through the colors"</span>, <span className="underline">_underlined_</span>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />
              </div>

              {/* Episode Tagline Box */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Episode Tagline (aka_line)</label>
                <input
                  type="text"
                  value={akaLine}
                  onChange={(e) => setAkaLine(e.target.value)}
                  placeholder="aka **the prodigy**, (he / him) ; twenty8"
                  className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Followers Count</label>
                  <input
                    type="text"
                    value={customFollowers}
                    onChange={(e) => setCustomFollowers(e.target.value)}
                    placeholder="Real count"
                    className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Following Count</label>
                  <input
                    type="text"
                    value={customFollowing}
                    onChange={(e) => setCustomFollowing(e.target.value)}
                    placeholder="Real count"
                    className="w-full h-11 px-4 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2.5 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="w-4 h-4 accent-[#f45b95] rounded"
                  />
                  <span>Verified badge (public figure)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBrand}
                    onChange={(e) => setIsBrand(e.target.checked)}
                    className="w-4 h-4 accent-[#f45b95] rounded"
                  />
                  <span>Brand account (shop, cafe, label)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNpc}
                    onChange={(e) => setIsNpc(e.target.checked)}
                    className="w-4 h-4 accent-[#f45b95] rounded"
                  />
                  <span>This is an NPC / Bot (neutral styling)</span>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Bio</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#1e2029] border border-neutral-200 dark:border-white/10 text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-neutral-200 dark:bg-[#1e2029] border border-neutral-300 dark:border-white/10 hover:bg-neutral-300 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="px-6 py-2.5 rounded-full text-white font-black shadow-md transition bg-[#f45b95]"
                >
                  {uploadingImage ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* QUICK AVATAR UPLOAD MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider">Update Character Avatar</h3>
              <button type="button" onClick={() => setIsAvatarModalOpen(false)} className="text-neutral-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <button type="button" onClick={() => setAvatarInputType("upload")} className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${avatarInputType === "upload" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500"}`}>Upload Picture</button>
              <button type="button" onClick={() => setAvatarInputType("url")} className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${avatarInputType === "url" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500"}`}>Picture / GIF Link</button>
            </div>

            {avatarInputType === "upload" ? (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:border-[#f45b95] transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload size={24} className="text-neutral-400 mb-2" />
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{uploading ? "Uploading..." : "Click to upload image"}</p>
                </div>
                <input type="file" accept="image/*" onChange={handleQuickFileUpload} className="hidden" />
              </label>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="url" placeholder="Paste image or GIF URL here..." value={newAvatarUrl} onChange={(e) => setNewAvatarUrl(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:border-[#f45b95]" />
                </div>
                <button type="button" onClick={() => handleUpdateAvatar(newAvatarUrl)} className="w-full py-2.5 rounded-full text-xs font-black text-white shadow-md transition" style={{ background: charGradientCss }}>Save Avatar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMAGE MODAL TARGET SUBMODAL FOR EDIT FORM */}
      {imageModalTarget && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white dark:bg-[#16171f] border border-neutral-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] uppercase tracking-wider">Upload {imageModalTarget}</span>
              <button type="button" onClick={() => setImageModalTarget(null)} className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center"><X size={12} /></button>
            </div>
            <div className="flex rounded-full bg-neutral-100 dark:bg-[#1e2029] p-0.5 border border-neutral-200 dark:border-white/5">
              <button type="button" onClick={() => setModalMode("upload")} className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${modalMode === "upload" ? "bg-white dark:bg-white/25 shadow-sm" : "text-neutral-500"}`}>Upload file</button>
              <button type="button" onClick={() => setModalMode("url")} className={`flex-1 py-1 rounded-full text-[10px] font-bold transition ${modalMode === "url" ? "bg-white dark:bg-white/25 shadow-sm" : "text-neutral-500"}`}>Image Link</button>
            </div>
            {modalMode === "upload" ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-neutral-300 dark:border-white/20 rounded-xl">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <button type="button" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()} className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold shadow-md transition" style={{ background: charGradientCss }}>
                  {uploadingImage ? "Uploading..." : "Browse files"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input type="url" placeholder="https://..." value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} className="w-full h-8 bg-neutral-100 dark:bg-[#191a21] border border-neutral-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none" />
                <button type="button" onClick={() => handleApplyImage(inputUrl.trim())} className="w-full h-8 rounded-lg text-white text-[11px] font-bold" style={{ background: charGradientCss }}>Apply</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}