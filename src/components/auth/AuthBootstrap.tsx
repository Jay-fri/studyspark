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
    // Supabase JS v2 fires INITIAL_SESSION on mount with the stored session.
    // Using onAuthStateChange as the single source of truth avoids the race
    // condition between a separate getSession() call and INITIAL_SESSION both
    // racing to call setProfile().
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchProfileWithRetry(session.user.id);
          setProfile(profile);
          if (profile?.role === "admin" && event === "SIGNED_IN") {
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

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
