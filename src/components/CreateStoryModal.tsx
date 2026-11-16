"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { X, Image as ImageIcon, Sparkles } from "lucide-react";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export default function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState("T: teen");
  const [visibility, setVisibility] = useState("Private: only writers you invite");
  const [contentWarnings, setContentWarnings] = useState("");
  const [iconColor, setIconColor] = useState("#f45b95");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      setError("Story title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Insert Story
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert({
          title: title.trim(),
          premise: premise.trim(),
          genre: genre.trim(),
          rating,
          visibility,
          content_warnings: contentWarnings.trim(),
          icon_color: iconColor,
          icon_url: iconUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // 2. Automatically create default channels (#main-story and #ooc-chat)
      if (storyData) {
        await supabase.from("channels").insert([
          { story_id: storyData.id, name: "main-story", type: "text" },
          { story_id: storyData.id, name: "ooc-chat", type: "text" },
        ]);
      }

      onStoryCreated();
      onClose();
    } catch (err: any) {
      console.error("Failed to create story:", err.message);
      setError(err.message || "Failed to create story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#16171f] border border-neutral-800 rounded-[28px] shadow-2xl p-6 md:p-8 text-white relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black tracking-wide mb-6">Start a story</h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Echoes of Tomorrow"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
              required
            />
          </div>

          {/* Premise */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Premise</label>
            <textarea
              rows={3}
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="Setting, tone, what you're looking for in partners..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition resize-none"
            />
          </div>

          {/* Genre & Rating Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Fantasy, sci-fi, slice of life..."
                className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
              >
                <option value="G: general">G: general</option>
                <option value="T: teen">T: teen</option>
                <option value="M: mature">M: mature</option>
                <option value="Explicit">Explicit</option>
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Who Can See It</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
            >
              <option value="Private: only writers you invite">Private: only writers you invite</option>
              <option value="Public: anyone can join">Public: anyone can join</option>
            </select>
          </div>

          {/* Content Warnings */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">
              Content Warnings (Comma Separated; Readers see these before entering)
            </label>
            <input
              type="text"
              value={contentWarnings}
              onChange={(e) => setContentWarnings(e.target.value)}
              placeholder="e.g. violence, character death"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
            />
          </div>

          {/* Icon Color & Icon URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Icon Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border border-neutral-800 cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-400">{iconColor}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Icon Picture Link</label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://... (800x800)"
                className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
              />
            </div>
          </div>

          {/* Banner Picture Link */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black tracking-wider text-neutral-400 uppercase">Banner Picture Link (1800 x 600)</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#f45b95] transition"
            />
          </div>

          <p className="text-[11px] text-neutral-400 font-medium italic">
            Your story starts with two channels: <span className="text-[#f45b95] font-bold">#main-story</span> and <span className="text-[#f45b95] font-bold">#ooc-chat</span>. You can add more later.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-[#f45b95] hover:bg-[#e04882] text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-[#f45b95]/20 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create story"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}