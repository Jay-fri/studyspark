import { useState, useCallback, useRef } from "react";
import { groqStream } from "@/services/groq";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { useTokens } from "./useTokens";
import { buildContextFromChunks } from "@/lib/documentChunker";
import { generateId } from "@/lib/utils";
import type { ChatMessage } from "@/types";

export function useGroq() {
  const [isStreaming, setIsStreaming] = useState(false);
  const rafRef      = useRef<number | null>(null);
  const pendingRef  = useRef("");
  const {
    sources,
    selectedSourceIds,
    chatMessages,
    addChatMessage,
    appendToLastMessage,
  } = useNotebookStore();
  const userId  = useAuthStore((s) => s.user?.id);
  const { spend } = useTokens();

  const chat = useCallback(
    async (userContent: string, notebookId: string) => {
      if (isStreaming || !userId) return;

      const userMsg: ChatMessage = {
        id:          generateId(),
        notebook_id: notebookId,
        user_id:     userId,
        role:        "user",
        content:     userContent,
        created_at:  new Date().toISOString(),
      };
      addChatMessage(userMsg);
      const { error: userInsertErr } = await (supabase.from("chat_messages") as any).insert(userMsg);
      if (userInsertErr) console.error("[chat] failed to save user message:", userInsertErr.message);

      const assistantMsg: ChatMessage = {
        id:          generateId(),
        notebook_id: notebookId,
        user_id:     userId,
        role:        "assistant",
        content:     "",
        created_at:  new Date().toISOString(),
      };
      addChatMessage(assistantMsg);
      setIsStreaming(true);

      try {
        await spend("chat");

        // Fetch chunks for selected sources, fall back to source.content for legacy sources
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

        const context = buildContextFromChunks(rawChunks, sources, selectedSourceIds, 6000);
        const history = chatMessages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

        const messages = [
          {
            role:    "system" as const,
            content: context
              ? `You are StudyLM, an expert AI study assistant. Use the following source material to answer questions accurately and helpfully. Always cite which source you're drawing from when relevant.\n\nSource material:\n${context}`
              : "You are StudyLM, an expert AI study assistant. No sources have been uploaded yet — answer from general knowledge and suggest the user uploads study material.",
          },
          ...history,
          { role: "user" as const, content: userContent },
        ];

        let fullContent = "";

        // Buffer chunks and flush to Zustand once per animation frame (≤60fps).
        // This prevents ReactMarkdown from re-parsing markdown on every tiny chunk,
        // giving smooth rendering without hundreds of re-renders per second.
        const flushPending = () => {
          const toAppend = pendingRef.current;
          pendingRef.current = "";
          rafRef.current = null;
          if (toAppend) appendToLastMessage(toAppend);
        };

        for await (const chunk of groqStream(messages)) {
          fullContent      += chunk;
          pendingRef.current += chunk;
          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(flushPending);
          }
        }

        // Flush any remaining buffered text after the stream ends
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (pendingRef.current) { appendToLastMessage(pendingRef.current); pendingRef.current = ""; }

        // Persist completed assistant message
        const { error: asstInsertErr } = await (supabase.from("chat_messages") as any)
          .insert({ ...assistantMsg, content: fullContent });
        if (asstInsertErr) console.error("[chat] failed to save assistant message:", asstInsertErr.message);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, userId, sources, selectedSourceIds, chatMessages, addChatMessage, appendToLastMessage, spend]
  );

  return { chat, isStreaming };
}
