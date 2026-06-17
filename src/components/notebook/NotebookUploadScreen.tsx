import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Upload, Link2, Play, Type, FileText,
  Layers, Network, Lightbulb, Loader2, CheckCircle, Zap, ArrowLeft,
} from "@/lib/icons";
import { useUploadSource } from "@/hooks/useUploadSource";
import { UploadModal } from "./UploadModal";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

const MAX_SIZE = 25 * 1024 * 1024;

const SOURCE_TYPES = [
  { icon: Link2, label: "Paste URL" },
  { icon: Play,  label: "YouTube"  },
  { icon: Type,  label: "Type notes" },
];

const ACTION_CARDS = [
  { icon: FileText, label: "Summary",   cost: 5, primary: true  },
  { icon: Layers,   label: "Flashcards", cost: 1, primary: true  },
  { icon: Lightbulb, label: "Quiz",     cost: 1, primary: false },
  { icon: Network,  label: "Mind Map",  cost: 5, primary: false },
];

function PreviewPanel() {
  return (
    <div
      className="hidden md:flex flex-col overflow-y-auto shrink-0"
      style={{ width: 220, minWidth: 220, padding: "20px 16px", borderLeft: "0.5px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Preview</span>
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [0.7, 0.25, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#38E0C3" }}
          />
          <span className="text-[10px]" style={{ color: "rgba(56,224,195,0.5)" }}>Live</span>
        </div>
      </div>

      {/* Summary skeleton */}
      <div
        className="rounded-xl p-3 mb-2.5"
        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <FileText className="w-3 h-3" style={{ color: "rgba(56,224,195,0.5)" }} />
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "rgba(56,224,195,0.5)" }}>
            Summary
          </span>
        </div>
        {[100, 78, 100, 55].map((w, i) => (
          <div key={i} className="mb-1 last:mb-0 rounded-full" style={{ height: 5, background: "rgba(255,255,255,0.07)", width: `${w}%` }} />
        ))}
      </div>

      {/* Flashcards skeleton */}
      <div
        className="rounded-xl p-3 mb-2.5"
        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <Layers className="w-3 h-3" style={{ color: "rgba(56,224,195,0.5)" }} />
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "rgba(56,224,195,0.5)" }}>
            Flashcards
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-md p-1.5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[8.5px] mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>Term</p>
              <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Quiz skeleton */}
      <div
        className="rounded-xl p-3 mb-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <Lightbulb className="w-3 h-3" style={{ color: "rgba(56,224,195,0.5)" }} />
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "rgba(56,224,195,0.5)" }}>
            Quiz
          </span>
        </div>
        <p className="text-[9px] mb-2 leading-snug" style={{ color: "rgba(255,255,255,0.42)" }}>
          What is the main concept in this topic?
        </p>
        {[true, false, false].map((correct, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-1 last:mb-0"
            style={{
              background: correct ? "rgba(56,224,195,0.07)" : "rgba(255,255,255,0.03)",
              border: `0.5px solid ${correct ? "rgba(56,224,195,0.18)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: correct ? "#38E0C3" : "rgba(255,255,255,0.14)" }} />
            <span className="text-[8.5px]" style={{ color: correct ? "rgba(56,224,195,0.65)" : "rgba(255,255,255,0.28)" }}>
              {correct ? "Correct answer" : `Option ${i === 1 ? "B" : "C"}`}
            </span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div
        className="flex items-start gap-2 px-3 py-2.5 rounded-[9px]"
        style={{ background: "rgba(56,224,195,0.04)", border: "0.5px solid rgba(56,224,195,0.12)" }}
      >
        <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "rgba(56,224,195,0.45)" }} />
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          Upload a file to see your{" "}
          <span style={{ color: "rgba(56,224,195,0.55)" }}>real preview</span>{" "}
          generated instantly from your content
        </p>
      </div>
    </div>
  );
}

interface Props {
  notebookId:    string;
  notebookTitle: string;
}

export function NotebookUploadScreen({ notebookId, notebookTitle }: Props) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const { uploadFile, progress, reset } = useUploadSource(notebookId);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    reset();
    await Promise.all(accepted.slice(0, 5).map(uploadFile));
  }, [uploadFile, reset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPTED_TYPES,
    maxSize:  MAX_SIZE,
    multiple: true,
  });

  const isUploading = !!progress && progress.stage !== "done" && progress.stage !== "error";
  const isDone      = progress?.stage === "done";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ zIndex: 1, position: "relative" }}>

      {/* Mobile header */}
      <div
        className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => navigate("/notebooks")}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#38E0C3"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
          {notebookTitle}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left column */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "24px 22px 36px", borderRight: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          {/* Hero */}
          <p
            className="text-[10.5px] font-medium uppercase mb-1.5"
            style={{ color: "rgba(56,224,195,0.6)", letterSpacing: "0.08em" }}
          >
            ✦ {notebookTitle}
          </p>
          <h1
            className="font-display font-medium leading-tight mb-2"
            style={{ fontSize: 21, color: "#fff", letterSpacing: "-0.02em" }}
          >
            Upload your material,<br />we'll build your study kit.
          </h1>
          <p className="text-[12px] mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.32)", maxWidth: 360 }}>
            Drop anything — PDF, DOCX, or paste your notes. StudyLM reads it and generates everything you need to ace your exams.
          </p>

          {/* Upload zone */}
          <div
            {...getRootProps()}
            className="rounded-[14px] text-center mb-3.5 cursor-pointer transition-all duration-200"
            style={{
              padding: "24px 20px",
              border: `1px dashed ${isDragActive ? "rgba(56,224,195,0.55)" : "rgba(56,224,195,0.22)"}`,
              background: isDragActive ? "rgba(56,224,195,0.08)" : "rgba(56,224,195,0.04)",
            }}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isUploading || isDone ? (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-1"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium truncate pr-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {progress!.filename}
                    </p>
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#38E0C3" }} />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "#38E0C3" }} />
                    )}
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "#38E0C3" }}
                      animate={{ width: `${progress!.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {isDone ? "Done! Switching to notebook…" : ({
                      extracting:  "Extracting text…",
                      uploading:   "Uploading…",
                      saving:      "Saving…",
                      processing:  "Processing document…",
                      done:        "",
                      error:       "",
                    } as Record<string, string>)[progress!.stage] ?? ""}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div
                    className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center mx-auto mb-2.5"
                    style={{ background: "rgba(56,224,195,0.1)", border: "0.5px solid rgba(56,224,195,0.2)" }}
                  >
                    <Upload className="w-5 h-5" style={{ color: "#38E0C3", opacity: 0.8 }} />
                  </div>
                  <p className="text-[13px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>
                    Drop your file here
                  </p>
                  <p className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
                    or choose a source type below
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {["PDF", "DOCX", "TXT", "MD"].map((ext) => (
                      <span
                        key={ext}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)" }}
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>or add from</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Source type buttons */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {SOURCE_TYPES.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setShowModal(true)}
                className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[11px] transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: "rgba(255,255,255,0.32)" }} />
                <span className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.38)" }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Then generate */}
          <p
            className="text-[10px] font-medium uppercase mb-2.5"
            style={{ color: "rgba(255,255,255,0.22)", letterSpacing: "0.07em" }}
          >
            Then generate →
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACTION_CARDS.map(({ icon: Icon, label, cost, primary }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-[11px]"
                style={{
                  padding: "11px 13px",
                  background: primary ? "rgba(56,224,195,0.08)" : "rgba(255,255,255,0.03)",
                  border: `0.5px solid ${primary ? "rgba(56,224,195,0.22)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <div
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: primary ? "rgba(56,224,195,0.12)" : "rgba(255,255,255,0.05)" }}
                >
                  <Icon
                    className="w-[15px] h-[15px]"
                    style={{ color: primary ? "#38E0C3" : "rgba(255,255,255,0.32)" }}
                  />
                </div>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: primary ? "#38E0C3" : "rgba(255,255,255,0.72)" }}
                >
                  {label}
                </span>
                <div
                  className="ml-auto flex items-center gap-0.5 text-[10px]"
                  style={{ color: primary ? "rgba(56,224,195,0.4)" : "rgba(255,255,255,0.22)" }}
                >
                  <Zap className="w-2.5 h-2.5" />
                  {cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — preview */}
        <PreviewPanel />
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showModal && (
          <UploadModal
            notebookId={notebookId}
            onClose={() => setShowModal(false)}
            onDone={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
