import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

export type ActivityType =
  | "study_generation"
  | "chat_message"
  | "quiz_completed"
  | "flashcard_session"
  | "chess_move"
  | "scrabble_move";

export function useStreak() {
  const profile = useAuthStore((s) => s.profile);

  const recordActivity = async (type: ActivityType) => {
    if (!profile?.id) return;

    try {
      const { data } = await supabase.rpc("record_activity", {
        p_user_id: profile.id,
        p_activity_type: type,
      });

      if (data?.is_new_day && data?.streak > 1) {
        toast(`🔥 ${data.streak} day streak! Keep it up.`, { duration: 4000 });
      }

      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();

      if (freshProfile) {
        useAuthStore.getState().refreshProfile(freshProfile as Profile);
      }
    } catch {
      // Streak errors are non-critical
    }
  };

  return { recordActivity };
}
