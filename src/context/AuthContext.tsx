"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_admin: boolean;
  posts_count?: number;
  characters_count?: number;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Hard emergency cutoff: force loading to false after 600ms
    const timer = setTimeout(() => {
      if (active) setLoading(false);
    }, 600);

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active && data?.session?.user) {
          setUser(data.session.user);
        }
      } catch (e) {
        console.warn("Auth initialization bypassed:", e);
      } finally {
        if (active) setLoading(false);
        clearTimeout(timer);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error:", e);
    }
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {};

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);