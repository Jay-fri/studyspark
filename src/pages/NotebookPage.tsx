import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, MessageSquare, Sparkles, Plus, ArrowLeft } from "@/lib/icons";
import toast from "react-hot-toast";

import { useNotebookStore } from "@/stores/notebookStore";
import { useNotebooks, useNotebookSources, useAIGenerate, useAIOutputs } from "@/hooks/useNotebook";
import { SourcePanel }  from "@/components/notebook/SourcePanel";
import { ChatPanel }    from "@/components/notebook/ChatPanel";
import { StudioPanel }  from "@/components/notebook/StudioPanel";
import { OutputModal }             from "@/components/notebook/OutputModal";
import { UploadModal }             from "@/components/notebook/UploadModal";
import { GenerationOptionsModal }  from "@/components/notebook/GenerationOptionsModal";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore }   from "@/stores/uiStore";
import { cn }           from "@/lib/utils";
import type { AIOutputType, GenerationOptions } from "@/types";
import { activeTour }   from "@/hooks/useTour";

// ── Desktop resize handle ────────────────────────────────────────────────────
function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative flex items-center justify-center w-[5px] shrink-0 hover:bg-[var(--brand-primary)]/20 transition-colors duration-150 z-10 cursor-col-resize">
      <div className="w-[1px] h-full bg-[var(--border)] group-hover:bg-[var(--brand-primary)] transition-colors duration-150" />
    </PanelResizeHandle>
  );
}

type MobileTab = "sources" | "chat" | "studio";

const MOBILE_TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: "sources", label: "Sources", icon: BookOpen      },
  { id: "chat",    label: "Chat",    icon: MessageSquare },
  { id: "studio",  label: "Studio",  icon: Sparkles      },
];

// ── sessionStorage helpers ───────────────────────────────────────────────────
function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string) {
  try { sessionStorage.setItem(key, val); } catch { /* ignore */ }
}
function ssDel(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

export default function NotebookPage() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Restore tab/modal from sessionStorage so state survives screen-off ──
  const [mobileTab, _setMobileTab] = useState<MobileTab>(() => {
    const saved = notebookId ? ssGet(`nb-tab-${notebookId}`) : null;
    return (saved as MobileTab) ?? "chat";
  });
  const setMobileTab = useCallback((tab: MobileTab) => {
    _setMobileTab(tab);
    if (notebookId) ssSet(`nb-tab-${notebookId}`, tab);
  }, [notebookId]);

  const [showUpload, setShowUpload] = useState(false);

  const [modalType, _setModalType] = useState<AIOutputType | null>(() => {
    const saved = notebookId ? ssGet(`nb-modal-type-${notebookId}`) : null;
    return (saved as AIOutputType) ?? null;
  });
  const [modalOpen, _setModalOpen] = useState<boolean>(() => {
    return notebookId ? ssGet(`nb-modal-open-${notebookId}`) === "true" : false;
  });

  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed,  setStudioCollapsed]  = useState(false);
  const [optionsType, setOptionsType] = useState<"quiz" | "flashcards" | null>(null);

  const sourcesPanelRef = useRef<PanelImperativeHandle | null>(null);
  const studioPanelRef  = useRef<PanelImperativeHandle | null>(null);

  const toggleSources = useCallback(() => {
    const panel = sourcesPanelRef.current;
    if (!panel) return;
    if (sourcesCollapsed) { panel.expand(); setSourcesCollapsed(false); }
    else                  { panel.collapse(); setSourcesCollapsed(true); }
  }, [sourcesCollapsed]);

  const toggleStudio = useCallback(() => {
    const panel = studioPanelRef.current;
    if (!panel) return;
    if (studioCollapsed) { panel.expand(); setStudioCollapsed(false); }
    else                 { panel.collapse(); setStudioCollapsed(true); }
  }, [studioCollapsed]);

  const balance = useAuthStore((s) => s.profile?.study_tokens ?? Infinity);
  const { setPaymentModalOpen } = useUIStore();

  const {
    activeNotebook,
    setActiveNotebook,
    aiOutputs,
    isGenerating,
    generatingType,
    setActiveOutput,
  } = useNotebookStore();

  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks();
  useNotebookSources(notebookId);
  useAIOutputs(notebookId);
  const { generate, cancel } = useAIGenerate(notebookId);

  useEffect(() => {
    // Don't redirect until the query has finished — the notebook may simply
    // not be in cache yet (e.g., just created and navigated directly to it).
    if (notebooksLoading || !notebooks || !notebookId) return;
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) { navigate("/notebooks"); return; }
    if (nb.id !== activeNotebook?.id) setActiveNotebook(nb);
  }, [notebookId, notebooks, notebooksLoading, activeNotebook?.id, setActiveNotebook, navigate]);

  // ── Restore modal after outputs load ────────────────────────────────────
  useEffect(() => {
    if (!modalOpen || !modalType || aiOutputs.length === 0) return;
    const exists = aiOutputs.some((o) => o.type === modalType);
    if (!exists) {
      // Output no longer exists — clear persisted modal state
      _setModalOpen(false);
      _setModalType(null);
      if (notebookId) {
        ssDel(`nb-modal-open-${notebookId}`);
        ssDel(`nb-modal-type-${notebookId}`);
      }
    } else {
      setActiveOutput(modalType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOutputs]);

  const runGenerate = useCallback(async (type: AIOutputType, options?: GenerationOptions) => {
    try {
      await generate(type, options);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} generated!`);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Generation failed";
      if (msg === "__RATE_LIMITED__") {
        toast.error("Rate limited. Please wait a moment and try again.");
      } else if (msg !== "AbortError" && msg !== "The user aborted a request.") {
        toast.error(msg);
      }
    }
  }, [generate]);

  const handleGenerate = useCallback((type: AIOutputType) => {
    if (type === "quiz" || type === "flashcards") {
      setOptionsType(type);
    } else {
      runGenerate(type);
    }
  }, [runGenerate]);

  const handleOptionsConfirm = useCallback((options: GenerationOptions) => {
    if (!optionsType) return;
    const type = optionsType;
    setOptionsType(null);
    runGenerate(type, options);
  }, [optionsType, runGenerate]);

  const handleOpen = useCallback((type: AIOutputType) => {
    _setModalType(type);
    _setModalOpen(true);
    setActiveOutput(type);
    if (notebookId) {
      ssSet(`nb-modal-type-${notebookId}`, type);
      ssSet(`nb-modal-open-${notebookId}`, "true");
    }
  }, [setActiveOutput, notebookId]);

  const handleModalGenerate = useCallback(async () => {
    if (!modalType) return;
    handleGenerate(modalType);
  }, [modalType, handleGenerate]);

  const closeModal = useCallback(() => {
    _setModalOpen(false);
    setTimeout(() => _setModalType(null), 300);
    if (notebookId) {
      ssDel(`nb-modal-open-${notebookId}`);
      ssDel(`nb-modal-type-${notebookId}`);
    }
  }, [notebookId]);

  const currentOutput    = modalType ? aiOutputs.find((o) => o.type === modalType) ?? null : null;
  const isGeneratingThis = isGenerating && generatingType === modalType;
  const safeBalance      = balance === Infinity ? 999 : balance;

  const studioProps = {
    outputs:        aiOutputs,
    isGenerating,
    generatingType: generatingType as import("@/types").AIOutputType | null,
    balance:        safeBalance,
    onGenerate:     handleGenerate,
    onOpen:         handleOpen,
    onTopUp:        () => setPaymentModalOpen(true),
  };

  if (!notebookId) return null;

  return (
    <div className="h-full overflow-hidden flex flex-col">

      {/* ── Mobile / tablet: tab bar (replaces the navbar on mobile) ──────── */}
      <div className="md:hidden flex items-center border-b border-[var(--border)] bg-[var(--surface-0)] shrink-0">
        {/* Back to notebooks */}
        <button
          onClick={() => navigate("/notebooks")}
          className="flex items-center justify-center w-10 h-full border-r border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-1)] transition-colors shrink-0"
          title="Back to notebooks"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {MOBILE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={id === "sources" ? "tour-sources-tab" : id === "chat" ? "tour-chat-tab" : "tour-study-tab"}
            onClick={() => {
              setMobileTab(id);
              if (activeTour.pendingTab === id) {
                activeTour.pendingTab = null;
                setTimeout(activeTour.moveNext, 400);
              }
            }}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              mobileTab === id
                ? "text-[var(--brand-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {mobileTab === id && (
              <motion.div
                layoutId="mobile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--brand-primary)] rounded-full"
              />
            )}
            {id === "studio" && isGenerating && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            )}
          </button>
        ))}

        {/* Add source shortcut in Sources tab */}
        {mobileTab === "sources" && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center justify-center w-10 h-full border-l border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-1)] transition-colors shrink-0"
            title="Add source"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Mobile / tablet: tab panels ───────────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mobileTab}
            initial={{ opacity: 0, x: mobileTab === "sources" ? -16 : mobileTab === "studio" ? 16 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mobileTab === "sources" ? 16 : mobileTab === "studio" ? -16 : 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="h-full w-full"
          >
            {mobileTab === "sources" && (
              <SourcePanel notebookId={notebookId} collapsed={false} onCollapse={() => {}} />
            )}
            {mobileTab === "chat" && (
              <ChatPanel notebookId={notebookId} />
            )}
            {mobileTab === "studio" && (
              <StudioPanel {...studioProps} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop: three-column resizable layout ────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden h-full">
        <PanelGroup orientation="horizontal" className="h-full">

          {/* Left: Sources */}
          <Panel
            panelRef={sourcesPanelRef}
            defaultSize="20%"
            minSize="200px"
            collapsible
            collapsedSize="44px"
            onResize={(size) => {
              setSourcesCollapsed(size.inPixels <= 44);
            }}
            className="h-full"
          >
            <SourcePanel
              notebookId={notebookId}
              collapsed={sourcesCollapsed}
              onCollapse={toggleSources}
            />
          </Panel>

          <ResizeHandle />

          {/* Center: Chat */}
          <Panel defaultSize="50%" minSize="240px" className="h-full">
            <ChatPanel notebookId={notebookId} />
          </Panel>

          <ResizeHandle />

          {/* Right: Studio */}
          <Panel
            panelRef={studioPanelRef}
            defaultSize="30%"
            minSize="200px"
            collapsible
            collapsedSize="44px"
            onResize={(size) => {
              setStudioCollapsed(size.inPixels <= 44);
            }}
            className="h-full"
          >
            <StudioPanel
              {...studioProps}
              collapsed={studioCollapsed}
              onCollapse={toggleStudio}
            />
          </Panel>

        </PanelGroup>
      </div>

      {/* ── Output modal ───────────────────────────────────────────────────── */}
      <OutputModal
        output={currentOutput}
        type={modalType}
        open={modalOpen}
        onClose={closeModal}
        onRegenerate={handleModalGenerate}
        isGenerating={isGenerating}
        isGeneratingThis={isGeneratingThis}
        onCancel={cancel}
        balance={safeBalance}
        onTopUp={() => setPaymentModalOpen(true)}
      />

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            notebookId={notebookId}
            onClose={() => setShowUpload(false)}
            onDone={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {/* Generation options modal (quiz / flashcards) */}
      <GenerationOptionsModal
        type={optionsType}
        onConfirm={handleOptionsConfirm}
        onClose={() => setOptionsType(null)}
      />
    </div>
  );
}
