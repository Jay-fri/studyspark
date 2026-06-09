import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types";

async function fetchProfileWithRetry(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) return data as Profile;
    if (error?.code === "PGRST301") break; // JWT expired — no point retrying
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

export function AuthBootstrap() {
  const { setUser, setProfile, setSession, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchProfileWithRetry(session.user.id);
          setProfile(profile);

          if (profile?.is_banned) {
            navigate("/banned", { replace: true });
          } else if (profile?.role === "admin" && event === "SIGNED_IN") {
            const current = window.location.pathname;
            if (current === "/" || current === "/auth") {
              navigate("/admin", { replace: true });
            }
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check immediately on mount in case user is already banned
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("id", session.user.id)
        .single();
      if (data?.is_banned) {
        const current = useAuthStore.getState().profile;
        if (current) useAuthStore.getState().setProfile({ ...current, is_banned: true, ban_reason: data.ban_reason });
        navigate("/banned", { replace: true });
      }
    });

    // Poll every 15s to catch ban while user is active — no realtime config needed
    const pollInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("id", session.user.id)
        .single();
      if (data?.is_banned) {
        clearInterval(pollInterval);
        const current = useAuthStore.getState().profile;
        if (current) useAuthStore.getState().setProfile({ ...current, is_banned: true, ban_reason: data.ban_reason });
        navigate("/banned", { replace: true });
      }
    }, 15_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
