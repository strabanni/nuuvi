"use client";

import React, { useRef, useState } from "react";
import { ImageIcon, Upload, Link as LinkIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  title?: string;
  bucketName?: string;
  pathPrefix?: string; // Added to support RLS folder structures
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  onSelectImage,
  title = "Upload Image",
  bucketName = "dm-attachments",
  pathPrefix = "uploads",
}: ImageUploadModalProps) {
  const [modalMode, setModalMode] = useState<"upload" | "url">("upload");
  const [inputUrl, setInputUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${pathPrefix}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // For Supabase storage, we pass the storage object path (or public URL depending on your DB schema)
      // If your messages table expects the storage path, pass filePath. If it expects publicUrl, pass publicUrl.
      // Let's pass the storage path so it matches what handleAttachmentSelect uses!
      onSelectImage(filePath);
      onClose();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!inputUrl.trim()) return;
    onSelectImage(inputUrl.trim());
    setInputUrl("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-[#14151b]/85 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.4)] flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#f45b95]/20 flex items-center justify-center text-[#f45b95]">
              <ImageIcon size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
  );
}