import { create } from "zustand";
import type { Notebook, Source, AIOutput, ChatMessage } from "@/types";

interface NotebookState {
  notebooks:          Notebook[];
  activeNotebook:     Notebook | null;
  sources:            Source[];
  aiOutputs:          AIOutput[];
  chatMessages:       ChatMessage[];
  isGenerating:       boolean;
  generatingType:     string | null;
  selectedSourceIds:  string[] | "all";
  activeOutputType:   string | null;
  starterQuestions:   string[];

  setNotebooks:          (nb: Notebook[]) => void;
  setStarterQuestions:   (qs: string[]) => void;
  addNotebook:        (nb: Notebook) => void;
  updateNotebook:     (nb: Notebook) => void;
  removeNotebook:     (id: string) => void;
  setActiveNotebook:  (nb: Notebook | null) => void;

  setSources:   (s: Source[]) => void;
  addSource:    (s: Source) => void;
  updateSource: (s: Source) => void;
  removeSource: (id: string) => void;

  setSelectedSourceIds: (ids: string[] | "all") => void;
  toggleSourceSelect:   (id: string) => void;

  setAIOutputs:    (o: AIOutput[]) => void;
  upsertAIOutput:  (o: AIOutput) => void;
  setActiveOutput: (type: string | null) => void;

  setChatMessages:     (m: ChatMessage[]) => void;
  addChatMessage:      (m: ChatMessage) => void;
  appendToLastMessage: (chunk: string) => void;

  setGenerating: (v: boolean, type?: string | null) => void;
}

export const useNotebookStore = create<NotebookState>()((set, get) => ({
  notebooks:         [],
  activeNotebook:    null,
  sources:           [],
  aiOutputs:         [],
  chatMessages:      [],
  isGenerating:      false,
  generatingType:    null,
  selectedSourceIds: "all",
  activeOutputType:  null,
  starterQuestions:  [],

  setNotebooks:          (notebooks)  => set({ notebooks }),
  setStarterQuestions:   (qs)         => set({ starterQuestions: qs }),
  addNotebook:       (nb)               => set((s) => ({ notebooks: [nb, ...s.notebooks] })),
  updateNotebook:    (nb)               => set((s) => ({ notebooks: s.notebooks.map((n) => n.id === nb.id ? nb : n) })),
  removeNotebook:    (id)               => set((s) => ({ notebooks: s.notebooks.filter((n) => n.id !== id) })),
  setActiveNotebook: (activeNotebook) => {
    const currentId = get().activeNotebook?.id;
    const newId     = activeNotebook?.id;
    // Only wipe per-notebook data when genuinely switching between two different
    // notebooks. On first activation (reload or initial entry) currentId is null —
    // don't clear, because the query hooks may have already populated the store.
    const isSwitching = currentId != null && currentId !== newId;
    if (isSwitching) {
      set({
        activeNotebook,
        sources:           [],
        aiOutputs:         [],
        chatMessages:      [],
        selectedSourceIds: "all",
        activeOutputType:  null,
        starterQuestions:  [],
      });
    } else {
      set({ activeNotebook });
    }
  },

  setSources:   (sources)  => set({ sources }),
  addSource:    (source)   => set((s) => ({ sources: [source, ...s.sources] })),
  updateSource: (source)   => set((s) => ({ sources: s.sources.map((x) => x.id === source.id ? source : x) })),
  removeSource: (id)       => set((s) => ({ sources: s.sources.filter((x) => x.id !== id) })),

  setSelectedSourceIds: (selectedSourceIds) => set({ selectedSourceIds }),
  toggleSourceSelect: (id) => {
    const { selectedSourceIds, sources } = get();
    if (selectedSourceIds === "all") {
      // Deselect all except this one
      set({ selectedSourceIds: [id] });
    } else {
      const current = selectedSourceIds as string[];
      if (current.includes(id)) {
        const next = current.filter((x) => x !== id);
        // If nothing selected, go back to "all"
        set({ selectedSourceIds: next.length === 0 ? "all" : next });
      } else {
        const next = [...current, id];
        // If all sources are now selected, switch to "all"
        set({ selectedSourceIds: next.length === sources.length ? "all" : next });
      }
    }
  },

  setAIOutputs:    (aiOutputs) => set({ aiOutputs }),
  upsertAIOutput:  (output)    =>
    set((s) => {
      const exists = s.aiOutputs.find((o) => o.type === output.type);
      return {
        aiOutputs: exists
          ? s.aiOutputs.map((o) => (o.type === output.type ? output : o))
          : [output, ...s.aiOutputs],
      };
    }),
  setActiveOutput: (activeOutputType) => set({ activeOutputType }),

  setChatMessages:     (chatMessages) => set({ chatMessages }),
  addChatMessage:      (m)            => set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  appendToLastMessage: (chunk)        =>
    set((s) => {
      const msgs = [...s.chatMessages];
      if (!msgs.length) return s;
      const last = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
      msgs[msgs.length - 1] = last;
      return { chatMessages: msgs };
    }),

  setGenerating: (v, type = null) => set({ isGenerating: v, generatingType: type }),
}));
