"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface HeaderPicture {
  id: string;
  url: string;
}

export function useHeaderPictures() {
  const [headers, setHeaders] = useState<HeaderPicture[]>([]);
  const [activeHeaderIndex, setActiveHeaderIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHeaders() {
      try {
        const { data, error } = await supabase
          .from("header_pictures")
          .select("id, url");

        if (!isMounted) return;

        if (error) {
          console.warn("Could not load header pictures:", error.message);
        } else if (data && data.length > 0) {
          setHeaders(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn("Network check: Supabase headers request aborted or offline.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHeaders();

    const channel = supabase
      .channel("shared-header-pictures-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "header_pictures" },
        () => {
          if (isMounted) loadHeaders();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (headers.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeaderIndex((prev) => (prev + 1) % headers.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [headers]);

  return { headers, activeHeaderIndex, loading };
}