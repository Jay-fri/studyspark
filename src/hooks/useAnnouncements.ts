import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Announcement } from "@/types";

export function useAnnouncements() {
  const userId = useAuthStore((s) => s.profile?.id);
  const qc = useQueryClient();

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: readIds = [] } = useQuery<string[]>({
    queryKey: ["announcement-reads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.announcement_id as string);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async (announcementId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("announcement_reads") as any).insert({
        user_id:         userId,
        announcement_id: announcementId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement-reads", userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = announcements.filter((a) => !readIds.includes(a.id));
      if (!unread.length) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("announcement_reads") as any).insert(
        unread.map((a) => ({ user_id: userId, announcement_id: a.id }))
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement-reads", userId] }),
  });

  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length;

  return { announcements, readIds, unreadCount, markRead, markAllRead };
}
