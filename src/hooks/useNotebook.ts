import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/services/supabase";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAuthStore } from "@/stores/authStore";
import type { Notebook, Source, AIOutputType, AIOutputContent, GenerationOptions } from "@/types";
import type { ChatMessage } from "@/types";
import { generateAIOutput } from "@/services/groq";
import { buildContextFromChunks } from "@/lib/documentChunker";
import { useTokens } from "./useTokens";
import type { OperationType } from "@/lib/tokenCounter";

export function useNotebooks() {
  const qc     = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { setNotebooks, addNotebook, updateNotebook, removeNotebook } = useNotebookStore();

  const query = useQuery({
    queryKey: ["notebooks", userId],
    queryFn: async (): Promise<Notebook[]> => {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime:    10 * 60_000,
  });

  useEffect(() => { if (query.data) setNotebooks(query.data); }, [query.data, setNotebooks]);

  const createNotebook = useMutation({
    mutationFn: async (input: Pick<Notebook, "title" | "description" | "emoji" | "color">): Promise<Notebook> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("notebooks") as any)
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: (nb) => { addNotebook(nb); qc.invalidateQueries({ queryKey: ["notebooks"] }); },
  });

  const patchNotebook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Notebook> & { id: string }): Promise<Notebook> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("notebooks") as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: (nb) => updateNotebook(nb),
  });

  const deleteNotebook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { removeNotebook(id); qc.invalidateQueries({ queryKey: ["notebooks"] }); },
  });

  const duplicateNotebook = useMutation({
    mutationFn: async (source: Notebook): Promise<Notebook> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("notebooks") as any)
        .insert({
          user_id:     userId,
          title:       `${source.title} (Copy)`,
          description: source.description,
          emoji:       source.emoji,
          color:       source.color,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: (nb) => { addNotebook(nb); qc.invalidateQueries({ queryKey: ["notebooks"] }); },
  });

  return { ...query, createNotebook, patchNotebook, deleteNotebook, duplicateNotebook };
}

export function useNotebookSources(notebookId: string | undefined) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { setSources, addSource, updateSource, removeSource } = useNotebookStore();

  const query = useQuery({
    queryKey: ["sources", notebookId],
    queryFn: async (): Promise<Source[]> => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .eq("notebook_id", notebookId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!notebookId,
    staleTime: 2 * 60_000,
    gcTime:    10 * 60_000,
  });

  useEffect(() => { if (query.data) setSources(query.data); }, [query.data, setSources, notebookId]);

  const renameSource = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }): Promise<Source> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("sources") as any)
        .update({ title })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Source;
    },
    onSuccess: (src) => { updateSource(src); qc.invalidateQueries({ queryKey: ["sources", notebookId] }); },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => { removeSource(id); qc.invalidateQueries({ queryKey: ["sources", notebookId] }); },
  });

  return { ...query, addSource, renameSource, deleteSource, userId };
}

export function useAIGenerate(notebookId: string | undefined) {
  const { upsertAIOutput, setGenerating, sources, selectedSourceIds, setActiveOutput } = useNotebookStore();
  const { spend } = useTokens();
  const userId    = useAuthStore((s) => s.user?.id);
  const qc        = useQueryClient();
  const abortRef  = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
  }, [setGenerating]);

  const generate = async (type: AIOutputType, options?: GenerationOptions): Promise<AIOutputContent> => {
    if (!notebookId || !userId) throw new Error("No active notebook");

    // Fetch chunks on-demand for selected sources
    const activeSources =
      selectedSourceIds === "all"
        ? sources
        : sources.filter((s) => (selectedSourceIds as string[]).includes(s.id));

    let rawChunks: { source_id: string; chunk_index: number; content: string }[] = [];
    if (activeSources.length > 0) {
      const { data } = await supabase
        .from("source_chunks")
        .select("source_id, chunk_index, content")
        .in("source_id", activeSources.map((s) => s.id))
        .order("chunk_index", { ascending: true });
      rawChunks = data ?? [];
    }

    const context = buildContextFromChunks(rawChunks, sources, selectedSourceIds, 8000);
    if (!context.trim()) throw new Error("No source content — add sources first");

    abortRef.current?.abort();
    const controller    = new AbortController();
    abortRef.current    = controller;

    setGenerating(true, type);
    try {
      await spend(type as OperationType);
      const content = await generateAIOutput(type, context, controller.signal, options);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("ai_outputs") as any)
        .upsert(
          {
            notebook_id: notebookId,
            user_id:     userId,
            type,
            content,
            tokens_used: 0,
            updated_at:  new Date().toISOString(),
          },
          { onConflict: "notebook_id,type" }
        )
        .select()
        .single();

      if (error) throw error;
      upsertAIOutput(data);
      setActiveOutput(type);
      qc.invalidateQueries({ queryKey: ["ai_outputs", notebookId] });
      return content;
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  };

  return { generate, cancel };
}

// Fetch existing AI outputs for a notebook
export function useAIOutputs(notebookId: string | undefined) {
  const { setAIOutputs } = useNotebookStore();

  const query = useQuery({
    queryKey: ["ai_outputs", notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
        .eq("notebook_id", notebookId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!notebookId,
    staleTime: 5 * 60_000,
    gcTime:    15 * 60_000,
  });

  useEffect(() => { if (query.data) setAIOutputs(query.data); }, [query.data, setAIOutputs, notebookId]);

  return query;
}

export function useNotebookChatMessages(notebookId: string | undefined) {
  const qc = useQueryClient();
  const { chatMessages, setChatMessages } = useNotebookStore();

  // Track which notebook we last loaded messages for, so we can detect notebook switches.
  // We use a ref instead of state to avoid triggering extra renders.
  const loadedForRef = useRef<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ["chat_messages", notebookId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("notebook_id", notebookId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!notebookId,
    staleTime: Infinity,
  });

  // Populate (or re-populate) the store whenever:
  //   1. This is a different notebook than we last loaded for, OR
  //   2. The store was externally cleared (setActiveNotebook wipes it)
  // We intentionally exclude chatMessages from deps to avoid re-running
  // during streaming (where messages are added optimistically).
  useEffect(() => {
    if (!query.data) return;
    const storeIsEmpty = chatMessages.length === 0;
    const isNewNotebook = loadedForRef.current !== notebookId;
    if (isNewNotebook || storeIsEmpty) {
      loadedForRef.current = notebookId;
      setChatMessages(query.data);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, notebookId, chatMessages.length]);

  const clearMessages = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("notebook_id", notebookId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setChatMessages([]);
      loadedForRef.current = undefined;
      qc.removeQueries({ queryKey: ["chat_messages", notebookId] });
    },
  });

  return { isLoading: query.isLoading && chatMessages.length === 0, clearMessages };
}
