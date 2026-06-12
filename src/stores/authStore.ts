import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types";

// Read cached session synchronously — prevents loading spinner on every tab return
const _hasCachedUser = (() => {
  try {
    return !!JSON.parse(localStorage.getItem("studylm-auth") ?? "{}").state?.user;
  } catch {
    return false;
  }
})();

interface AuthState {
  user:       User    | null;
  profile:    Profile | null;
  session:    Session | null;
  isLoading:  boolean;
  isAdmin:    boolean;

  setUser:        (user: User | null) => void;
  setProfile:     (profile: Profile | null) => void;
  setSession:     (session: Session | null) => void;
  setLoading:     (loading: boolean) => void;
  refreshProfile: (profile: Profile) => void;
  signOut:        () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:      null,
      profile:   null,
      session:   null,
      isLoading: !_hasCachedUser,
      isAdmin:   false,

      setUser:    (user)    => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setProfile: (profile) =>
        set({ profile, isAdmin: profile?.role === "admin" }),
      refreshProfile: (profile) =>
        set({ profile, isAdmin: profile.role === "admin" }),
      signOut: () =>
        set({ user: null, profile: null, session: null, isAdmin: false }),
    }),
    {
      name: "studylm-auth",
      partialize: (state) => ({
        user:    state.user,
        profile: state.profile,
        session: state.session,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
