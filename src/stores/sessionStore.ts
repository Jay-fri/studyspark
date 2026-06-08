import { create } from "zustand";
import type { ChatMessage } from "@/types";

interface SessionState {
  activeNotebookId: string | null;
  messages:         ChatMessage[];
  isStreaming:      boolean;
  setActiveNotebookId: (id: string | null)  => void;
  addMessage:          (m: ChatMessage)     => void;
  setMessages:         (m: ChatMessage[])   => void;
  appendToLastMessage: (chunk: string)      => void;
  setStreaming:         (v: boolean)        => void;
  clearSession:         ()                  => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  activeNotebookId: null,
  messages:         [],
  isStreaming:      false,
  setActiveNotebookId: (activeNotebookId) => set({ activeNotebookId }),
  addMessage:      (m)     => set((s) => ({ messages: [...s.messages, m] })),
  setMessages:     (messages) => set({ messages }),
  appendToLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      if (!msgs.length) return s;
      const last = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
      msgs[msgs.length - 1] = last;
      return { messages: msgs };
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearSession: ()           => set({ activeNotebookId: null, messages: [], isStreaming: false }),
}));
