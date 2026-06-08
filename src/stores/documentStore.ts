import { create } from "zustand";
import type { Source } from "@/types";

// Legacy shape used by older page components
export interface LegacyDocument {
  id:           string;
  user_id:      string;
  title:        string;
  content:      string;
  file_type:    "pdf" | "docx" | "txt" | "md";
  file_size:    number;
  page_count:   number | null;
  storage_path: string;
  created_at:   string;
  updated_at:   string;
}

interface DocumentState {
  documents:       LegacyDocument[];
  activeDocument:  LegacyDocument | null;
  setDocuments:    (docs: LegacyDocument[]) => void;
  addDocument:     (doc: LegacyDocument)    => void;
  removeDocument:  (id: string)             => void;
  setActiveDocument:(doc: LegacyDocument | null) => void;
}

export const useDocumentStore = create<DocumentState>()((set) => ({
  documents:      [],
  activeDocument: null,
  setDocuments:    (documents)        => set({ documents }),
  addDocument:     (doc)              => set((s) => ({ documents: [doc, ...s.documents] })),
  removeDocument:  (id)               => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
  setActiveDocument:(activeDocument)  => set({ activeDocument }),
}));

// Convert Source → LegacyDocument for components that use the old type
export function sourceToDocument(s: Source): LegacyDocument {
  return {
    id:           s.id,
    user_id:      s.user_id,
    title:        s.title,
    content:      s.content ?? "",
    file_type:    (["pdf","docx","txt","md"].includes(s.type) ? s.type : "txt") as LegacyDocument["file_type"],
    file_size:    0,
    page_count:   null,
    storage_path: s.file_url ?? "",
    created_at:   s.created_at,
    updated_at:   s.created_at,
  };
}
