import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  File,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatBytes, getFileExtension } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface FileItem {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export default function UploadPage() {
  const [files, setFiles] = useState<FileItem[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: FileItem[] = accepted.map((f) => ({
      file: f,
      id:   Math.random().toString(36).slice(2),
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        const msg = r.errors[0]?.message ?? "File rejected";
        toast.error(`${r.file.name}: ${msg}`);
      });
    },
  });

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      );

      try {
        // TODO: implement actual upload to Supabase Storage + extraction
        await new Promise((r) => setTimeout(r, 1200));
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "done" } : f))
        );
        toast.success(`${item.file.name} uploaded!`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: msg } : f))
        );
        toast.error(`${item.file.name}: ${msg}`);
      }
    }
  };

  const getIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
    if (ext === "docx") return <File className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-text-muted" />;
  };

  const hasPending = files.some((f) => f.status === "pending");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Upload Documents"
        subtitle="Upload PDFs, Word documents, or text files to study with AI"
      />

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-brand-primary bg-brand-primary/5 scale-[1.01]"
            : "border-border hover:border-brand-primary/50 hover:bg-surface-2/50"
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -6 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Upload className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <p className="text-base font-medium text-text-primary mb-1">
            {isDragActive ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-text-secondary mb-3">
            or click to browse
          </p>
          <p className="text-xs text-text-muted">
            PDF, DOCX, TXT, MD · Max 20 MB per file
          </p>
        </motion.div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-2"
          >
            {files.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-1 border border-border"
              >
                <div className="shrink-0">{getIcon(item.file.name)}</div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-text-muted">{formatBytes(item.file.size)}</p>
                </div>

                <div className="shrink-0">
                  {item.status === "pending" && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1 rounded-lg text-text-muted hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === "uploading" && (
                    <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                  )}
                  {item.status === "error" && (
                    <span title={item.error}>
                      <AlertCircle className="w-4 h-4 text-brand-danger" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {hasPending && (
              <button
                onClick={uploadAll}
                className="w-full mt-4 py-2.5 px-4 rounded-xl gradient-brand text-white text-sm font-medium shadow-md hover:opacity-90 transition-opacity"
              >
                Upload {files.filter((f) => f.status === "pending").length} file
                {files.filter((f) => f.status === "pending").length > 1 ? "s" : ""}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
