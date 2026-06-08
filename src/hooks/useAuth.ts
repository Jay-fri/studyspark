import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export function useAuth() {
  const store    = useAuthStore();
  const navigate = useNavigate();

  // Bootstrap auth state on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      store.setSession(session);
      store.setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        store.setProfile(profile);
      }
      store.setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        store.setSession(session);
        store.setUser(session?.user ?? null);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          store.setProfile(profile);
        } else {
          store.setProfile(null);
        }
        store.setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, university?: string): Promise<{ sessionAvailable: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, university } },
    });
    if (error) throw error;

    if (data.user) {
      // Insert profile row if the DB trigger hasn't created it yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any).upsert(
        {
          id:           data.user.id,
          email,
          full_name:    fullName,
          university:   university ?? null,
          study_tokens: 1000,
          role:         "student",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      // Always patch university + full_name — if the trigger created the row first
      // without these fields, the upsert above was a no-op and we'd lose the data.
      await supabase
        .from("profiles")
        .update({ university: university ?? null, full_name: fullName })
        .eq("id", data.user.id);
    }

    // If Supabase returns a session immediately (email confirmation disabled),
    // the onAuthStateChange listener will populate the store automatically.
    return { sessionAvailable: !!data.session };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=reset`,
    });
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Pick<Profile, "full_name" | "university" | "avatar_url">>) => {
    if (!store.user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ ...(updates as any), updated_at: new Date().toISOString() })
      .eq("id", store.user.id)
      .select()
      .single();
    if (error) throw error;
    store.setProfile(data as Profile);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    store.signOut();
    navigate("/");
  };

  return {
    user:           store.user,
    profile:        store.profile,
    session:        store.session,
    isLoading:      store.isLoading,
    isAdmin:        store.isAdmin,
    signIn,
    signUp,
    signInWithGoogle,
    sendPasswordReset,
    updateProfile,
    signOut,
  };
}
