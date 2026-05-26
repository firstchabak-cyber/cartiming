"use client";

import { useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";

export function useUser() {
  const { profile, isLoading, setProfile, setLoading } = useAuthStore();

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setProfile(null);
      return;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("id, email, name, avatar_url, provider, created_at")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!row) {
      setProfile({
        id: auth.user.id,
        email: auth.user.email ?? "",
        name: auth.user.user_metadata?.name,
        avatar_url: auth.user.user_metadata?.avatar_url,
        provider: auth.user.app_metadata?.provider as never,
        created_at: auth.user.created_at,
      });
      return;
    }

    setProfile({
      id: row.id,
      email: row.email,
      name: row.name ?? undefined,
      avatar_url: row.avatar_url ?? undefined,
      provider: (row.provider as never) ?? undefined,
      created_at: row.created_at,
    });
  }, [setProfile, setLoading]);

  useEffect(() => {
    loadProfile();

    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      loadProfile();
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, setProfile]);

  return { profile, isLoading, refresh: loadProfile };
}
