import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { extractTextFromFile, countWords } from "@/services/fileParser";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import type { Source } from "@/types";

export type UploadStage =
  | "extracting"   // client-side PDF/DOCX parsing
  | "uploading"    // PUT to R2
  | "saving"       // INSERT source metadata row
  | "processing"   // Edge Function chunking text
  | "done"
  | "error";

export interface UploadProgress {
  filename: string;
  stage:    UploadStage;
  percent:  number;
  error?:   string;
}

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function edgeHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type":  "application/json",
    "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
  };
}

export function useUploadSource(notebookId: string) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const userId      = useAuthStore((s) => s.user?.id);
  const qc          = useQueryClient();
  const { addSource, updateSource } = useNotebookStore();

  const uploadFile = useCallback(async (file: File): Promise<Source | null> => {
    if (!userId || !notebookId) return null;

    setProgress({ filename: file.name, stage: "extracting", percent: 10 });

    try {
      // ── 1. Extract text client-side ──────────────────────────────────────
      const text = await extractTextFromFile(file);

      setProgress({ filename: file.name, stage: "uploading", percent: 30 });

      // ── 2. Get presigned R2 upload URL ───────────────────────────────────
      const headers = await edgeHeaders();
      const urlRes = await fetch(`${EDGE_BASE}/generate-upload-url`, {
        method:  "POST",
        headers,
        body:    JSON.stringify({ filename: file.name }),
      });

      if (!urlRes.ok) {
        const { error } = await urlRes.json() as { error?: string };
        throw new Error(error ?? "Failed to get upload URL");
      }

      const { uploadUrl, fileKey, fileUrl } = await urlRes.json() as {
        uploadUrl: string;
        fileKey:   string;
        fileUrl:   string;
      };

      // ── 3. Upload raw file directly to R2 ────────────────────────────────
      // Only the "host" header is signed — do NOT add Authorization here.
      const r2Res = await fetch(uploadUrl, {
        method: "PUT",
        body:   file,
        // Content-Type is intentionally omitted: R2 will infer from the presigned URL
      });

      if (!r2Res.ok) throw new Error(`R2 upload failed: ${r2Res.status}`);

      setProgress({ filename: file.name, stage: "saving", percent: 60 });

      // ── 4. Save source metadata (no content yet, status: pending) ─────────
      const ext        = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const sourceType = (
        ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "md" ? "md" : "txt"
      ) as Source["type"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbErr } = await (supabase.from("sources") as any)
        .insert({
          notebook_id:        notebookId,
          user_id:            userId,
          title:              file.name.replace(/\.[^/.]+$/, ""),
          type:               sourceType,
          content:            null,          // text lives in source_chunks
          file_url:           fileUrl,
          file_path:          fileKey,
          word_count:         countWords(text),
          processing_status:  "pending",
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const source = data as Source;
      addSource(source);
      qc.invalidateQueries({ queryKey: ["sources", notebookId] });

      setProgress({ filename: file.name, stage: "processing", percent: 80 });

      // ── 5. Chunk text via Edge Function ───────────────────────────────────
      const processRes = await fetch(`${EDGE_BASE}/process-source`, {
        method:  "POST",
        headers: await edgeHeaders(),
        body:    JSON.stringify({ sourceId: source.id, text }),
      });

      if (!processRes.ok) {
        // Non-fatal: source is created, processing can be retried
        console.error("process-source failed:", await processRes.text());
        updateSource({ ...source, processing_status: "error" });
      } else {
        updateSource({ ...source, processing_status: "ready" });
        qc.invalidateQueries({ queryKey: ["sources", notebookId] });
      }

      setProgress({ filename: file.name, stage: "done", percent: 100 });
      return { ...source, processing_status: "ready" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setProgress({ filename: file.name, stage: "error", percent: 0, error: msg });
      return null;
    }
  }, [userId, notebookId, addSource, updateSource]);

  const uploadText = useCallback(async (title: string, text: string): Promise<Source | null> => {
    if (!userId || !notebookId) return null;

    setProgress({ filename: title, stage: "saving", percent: 50 });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbErr } = await (supabase.from("sources") as any)
        .insert({
          notebook_id:       notebookId,
          user_id:           userId,
          title,
          type:              "text",
          content:           text,  // keep content for text sources (display + fallback)
          file_url:          null,
          file_path:         null,
          word_count:        countWords(text),
          processing_status: "pending",
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const source = data as Source;
      addSource(source);
      qc.invalidateQueries({ queryKey: ["sources", notebookId] });

      setProgress({ filename: title, stage: "processing", percent: 75 });

      // Chunk text so AI context uses the same code path as file sources
      const processRes = await fetch(`${EDGE_BASE}/process-source`, {
        method:  "POST",
        headers: await edgeHeaders(),
        body:    JSON.stringify({ sourceId: source.id, text }),
      });

      if (processRes.ok) {
        updateSource({ ...source, processing_status: "ready" });
      }

      setProgress({ filename: title, stage: "done", percent: 100 });
      return { ...source, processing_status: "ready" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setProgress({ filename: title, stage: "error", percent: 0, error: msg });
      return null;
    }
  }, [userId, notebookId, addSource, updateSource]);

  const reset = useCallback(() => setProgress(null), []);

  return { uploadFile, uploadText, progress, reset };
}
