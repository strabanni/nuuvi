"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Bagel_Fat_One } from "next/font/google";

// font for nuuvi homepage
const bagelFont = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
});

export default function AuthModal() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    const syntheticEmail = `${cleanUsername}@nuuvi.app`;

    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });
        if (error) throw error;
      } else {
        if (!cleanUsername) throw new Error("Please enter a username.");
        const cleanCode = inviteCode.trim().toUpperCase();

        if (!cleanCode) {
          throw new Error("An invite code is required to join.");
        }

        // 1. Verify code validity before triggering signup
        const { data: codeData, error: codeCheckError } = await supabase
          .from("invite_codes")
          .select("code, is_used")
          .eq("code", cleanCode)
          .single();

        if (codeCheckError || !codeData) {
          throw new Error("Invalid invite code.");
        }
        if (codeData.is_used) {
          throw new Error("This invite code has already been redeemed.");
        }

        // 2. Perform Supabase Sign Up
        const finalDisplayName = displayName.trim() || cleanUsername.toUpperCase();

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: finalDisplayName,
              invited_by: cleanCode,
            },
          },
        });

        if (authError) throw authError;

        // 3. Mark invite code as redeemed
        if (authData.user) {
          await supabase.rpc("validate_and_claim_invite", {
            target_code: cleanCode,
            target_user_id: authData.user.id,
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#e6e8ec] flex flex-col items-center justify-center p-4 selection:bg-[#f45b95] selection:text-white">
      {/* Brand Icon & Wordmark */}
      <div 
        className="flex flex-col items-center mb-3.5 select-none relative shrink-0"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Icon Wrapper with Ambient Halo Glow */}omeome
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          {/* Pink Dust Glow Layer */}
          <div 
            className="absolute w-16 h-16 rounded-full bg-[#f45b95] opacity-35 blur-xl pointer-events-none scale-85 transform-gpu will-change-transform translate-z-0"
            aria-hidden="true"
          />

          <Image
            src="/nuuvi-logo.png"
            alt="nuuvi"
            width={64}
            height={64}
            priority
            draggable={false}
            className="relative z-10 object-contain pointer-events-none select-none drop-shadow-[0_8px_16px_rgba(244,114,182,0.28)]"
          />
        </div>

        {/* Wordmark using Bagel Fat One */}
        <h1 
          className={`${bagelFont.className} text-5xl text-[#f45b95] tracking-tight -mt-1.5 select-none relative z-10`}
        >
          nuuvi
        </h1>
      </div>

      {/* sign in card */}
      <div className="w-full max-w-[270px] bg-white rounded-[22px] p-3.5 shadow-xl shadow-neutral-400/25 flex flex-col items-center">
        {/* toggle bar for account creation */}
        <div className="w-full bg-[#f0f1f4] p-0.5 rounded-full flex items-center mb-3 h-11">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setErrorMsg(null);
            }}
            className={`h-8 flex-1 py-2.5 text-[11px] font-semibold rounded-full transition-all duration-300 ${
              tab === "signin"
                ? "bg-white text-neutral-800 shadow-sm translate-x-1.5"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span className="-translate-y-[1.5px] inline-block">
              Sign in
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-full transition-all duration-200 ${
              tab === "signup"
                ? "bg-white text-neutral-800 shadow-sm -translate-x-2"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span className="-translate-y-[1.0px] inline-block">
              Create Account
            </span>
          </button>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="w-full mb-3 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-[10px] font-medium text-center leading-tight">
            {errorMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
          {/* USERNAME */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-8 bg-[#f0f1f4] text-neutral-800 text-xs font-medium px-3.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-pink-300 transition"
            />
          </div>

          {/* DISPLAY NAME (Optional, Sign Up only) */}
          {tab === "signup" && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                  Display Name
                </label>
                <span className="text-[8px] font-medium text-neutral-400">Optional</span>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional display name"
                className="w-full h-8 bg-[#f0f1f4] text-neutral-800 text-xs font-medium px-3.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-pink-300 transition"
              />
            </div>
          )}

          {/* PASSWORD */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-8 bg-[#f0f1f4] text-neutral-800 text-xs font-medium px-3.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-pink-300 transition"
            />
          </div>

          {/* INVITE CODE (Sign Up only) */}
          {tab === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-1">
                Invite Code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="NUUVI-XXXX-XXXX"
                className="w-full h-8 bg-[#f0f1f4] text-neutral-800 text-xs font-mono font-medium px-3.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-pink-300 uppercase transition tracking-wider"
              />
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-8 bg-[#a3a3a8] hover:bg-[#8e8e93] active:bg-[#7c7c82] disabled:opacity-50 text-white font-medium text-xs rounded-full transition-colors mt-1.5 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            <span>{tab === "signin" ? "Sign in" : "Create account"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}