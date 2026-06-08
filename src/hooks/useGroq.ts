import { useState, useCallback } from "react";
import { groqStream } from "@/services/groq";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { useTokens } from "./useTokens";
import { buildContext } from "@/lib/documentChunker";
import { generateId } from "@/lib/utils";
import type { ChatMessage } from "@/types";

export function useGroq() {
  const [isStreaming, setIsStreaming] = useState(false);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("chat_messages") as any).insert(userMsg);

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

        // Use buildContext with selected sources (max 6000 tokens for chat context)
        const context = buildContext(sources, selectedSourceIds, 6000);
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
        for await (const chunk of groqStream(messages)) {
          appendToLastMessage(chunk);
          fullContent += chunk;
        }

        // Persist completed assistant message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("chat_messages") as any).insert({ ...assistantMsg, content: fullContent });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, userId, sources, selectedSourceIds, chatMessages, addChatMessage, appendToLastMessage, spend]
  );

  return { chat, isStreaming };
}
