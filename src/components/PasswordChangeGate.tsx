"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PasswordChangeGate({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords don't match.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch("/api/account/change-temporary-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword: password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update your password.");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#e8eaee] p-4 dark:bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-[#16171f]"
      >
        <h1 className="text-xl font-black text-neutral-900 dark:text-white">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Your administrator issued a temporary password. Set a new one to continue.
        </p>

        <label className="mt-5 block text-xs font-bold text-black" htmlFor="new-password">
          New password
        </label>
        <div className="relative mt-1">
            <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-neutral-100 px-4 py-3 pr-20 text-sm text-black outline-none focus:ring-2 focus:ring-[#f45b95]"
                style={{
                color: "#000",
                WebkitTextFillColor: "#000",
                caretColor: "#000",
                }}
            />
            <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-700 hover:text-black"
            >
                {showPassword ? "Hide" : "Show"}
            </button>
        </div>

        <label className="mt-4 block text-xs font-bold text-black" htmlFor="confirm-password">
          Confirm new password
        </label>
        <div className="relative mt-1">
            <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-neutral-100 px-4 py-3 pr-20 text-sm text-black outline-none focus:ring-2 focus:ring-[#f45b95]"
                style={{
                color: "#000",
                WebkitTextFillColor: "#000",
                caretColor: "#000",
                }}
            />
            <button
                type="button"
                onClick={() => setShowConfirmPassword((shown) => !shown)}
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                aria-pressed={showConfirmPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-700 hover:text-black"
            >
                {showConfirmPassword ? "Hide" : "Show"}
            </button>
        </div>
                {error && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-full bg-[#f45b95] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "Updating…" : "Set new password"}
        </button>
      </form>
    </main>
  );
}