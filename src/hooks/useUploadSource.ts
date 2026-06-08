import { useState, useCallback } from "react";
import { supabase } from "@/services/supabase";
import { extractTextFromFile, countWords } from "@/services/fileParser";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { generateId } from "@/lib/utils";
import type { Source } from "@/types";

export interface UploadProgress {
  filename: string;
  stage:    "extracting" | "uploading" | "saving" | "done" | "error";
  percent:  number;
  error?:   string;
}

export function useUploadSource(notebookId: string) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const userId   = useAuthStore((s) => s.user?.id);
  const { addSource } = useNotebookStore();

  const uploadFile = useCallback(async (file: File): Promise<Source | null> => {
    if (!userId || !notebookId) return null;

    setProgress({ filename: file.name, stage: "extracting", percent: 10 });

    try {
      // 1. Extract text from file
      const content = await extractTextFromFile(file);
      setProgress({ filename: file.name, stage: "uploading", percent: 45 });

      // 2. Upload raw file to Supabase Storage
      const ext      = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const filePath = `${userId}/${notebookId}/${generateId()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("sources")
        .upload(filePath, file, { upsert: false });

      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage
        .from("sources")
        .getPublicUrl(filePath);

      setProgress({ filename: file.name, stage: "saving", percent: 80 });

      // 3. Save source record
      const sourceType = (ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "md" ? "md" : "txt") as Source["type"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("sources") as any)
        .insert({
          notebook_id: notebookId,
          user_id:     userId,
          title:       file.name.replace(/\.[^/.]+$/, ""),
          type:        sourceType,
          content,
          file_url:    publicUrl,
          word_count:  countWords(content),
        })
        .select()
        .single();

      if (error) throw error;

      const source = data as Source;
      addSource(source);

      setProgress({ filename: file.name, stage: "done", percent: 100 });
      return source;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setProgress({ filename: file.name, stage: "error", percent: 0, error: msg });
      return null;
    }
  }, [userId, notebookId, addSource]);

  const uploadText = useCallback(async (title: string, text: string): Promise<Source | null> => {
    if (!userId || !notebookId) return null;

    setProgress({ filename: title, stage: "saving", percent: 60 });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("sources") as any)
        .insert({
          notebook_id: notebookId,
          user_id:     userId,
          title,
          type:        "text",
          content:     text,
          file_url:    null,
          word_count:  countWords(text),
        })
        .select()
        .single();

      if (error) throw error;

      const source = data as Source;
      addSource(source);

      setProgress({ filename: title, stage: "done", percent: 100 });
      return source;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setProgress({ filename: title, stage: "error", percent: 0, error: msg });
      return null;
    }
  }, [userId, notebookId, addSource]);

  const reset = useCallback(() => setProgress(null), []);

  return { uploadFile, uploadText, progress, reset };
}
