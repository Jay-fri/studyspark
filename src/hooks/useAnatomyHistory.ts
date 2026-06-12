import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { AIChatMessage } from '@/components/anatomy/AnatomyLayout'

export interface AnatomySession {
  id: string
  mesh_name: string
  part_name: string
  part_system: string
  model_key: string
  ai_response: string
  chat_history: AIChatMessage[]
  created_at: string
}

export function useAnatomyHistory() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<AnatomySession[]>({
    queryKey: ['anatomy-history', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anatomy_chats')
        .select('id, mesh_name, part_name, part_system, model_key, ai_response, chat_history, created_at')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as AnatomySession[]
    },
    staleTime: 30_000,
  })
}

export function useInvalidateAnatomyHistory() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return () => queryClient.invalidateQueries({ queryKey: ['anatomy-history', userId] })
}
