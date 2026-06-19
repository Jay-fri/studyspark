import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, MessageSquare, Sparkles, Plus, ArrowLeft, Timer } from "@/lib/icons";
import toast from "react-hot-toast";

import { useNotebookStore } from "@/stores/notebookStore";
import { useNotebooks, useNotebookSources, useAIGenerate, useAIOutputs } from "@/hooks/useNotebook";
import { SourcePanel }  from "@/components/notebook/SourcePanel";
import { ChatPanel }    from "@/components/notebook/ChatPanel";
import { StudioPanel }  from "@/components/notebook/StudioPanel";
import { NotebookUploadScreen } from "@/components/notebook/NotebookUploadScreen";
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
  { id: "sources", label: "Sources",  icon: BookOpen      },
  { id: "chat",    label: "Chat AI",  icon: MessageSquare },
  { id: "studio",  label: "Generate", icon: Sparkles      },
];

// ── Notebook onboarding progress steps ───────────────────────────────────────
function NotebookProgressSteps({
  notebookId,
  hasSource,
  hasChat,
  hasOutput,
}: {
  notebookId: string;
  hasSource: boolean;
  hasChat: boolean;
  hasOutput: boolean;
}) {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(`studyai_nb_graduated_${notebookId}`)
  );

  useEffect(() => {
    if (hasOutput && visible) {
      localStorage.setItem(`studyai_nb_graduated_${notebookId}`, "1");
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [hasOutput, visible, notebookId]);

  const steps: { label: string; done: boolean }[] = [
    { label: "Add source", done: hasSource },
    { label: "Chat with AI", done: hasChat },
    { label: "Generate content", done: hasOutput },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden shrink-0"
          style={{ borderBottom: "0.5px solid var(--border)" }}
        >
          <div className="flex items-center gap-4 px-4 py-2" style={{ background: "var(--surface-1)" }}>
            {steps.map(({ label, done }, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <div
                    className="w-5 h-px mx-0.5"
                    style={{ background: done ? "rgba(56,224,195,0.4)" : "var(--border)" }}
                  />
                )}
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: done ? "rgba(56,224,195,0.15)" : "var(--surface-2)",
                    color: done ? "#38E0C3" : "var(--text-muted)",
                    border: `0.5px solid ${done ? "rgba(56,224,195,0.3)" : "var(--border)"}`,
                  }}
                >
                  {done ? "✓" : idx + 1}
                </span>
                <span
                  className="text-[10px] hidden sm:block"
                  style={{ color: done ? "#38E0C3" : "var(--text-muted)" }}
                >
                  {label}
                </span>
              </div>
            ))}
            <span className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>
              {steps.filter((s) => s.done).length}/3
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
    return (saved as MobileTab) ?? "studio";
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
    sources,
    aiOutputs,
    chatMessages,
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
    const wasFirst = aiOutputs.length === 0;
    try {
      await generate(type, options);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      toast.success(wasFirst ? `${label} ready! 🎉 Explore Studio to view it.` : `${label} generated!`);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Generation failed";
      if (msg === "__RATE_LIMITED__") {
        toast.error("Rate limited. Please wait a moment and try again.");
      } else if (msg !== "AbortError" && msg !== "The user aborted a request.") {
        toast.error(msg);
      }
    }
  }, [generate, aiOutputs.length]);

  const handleGenerate = useCallback((type: AIOutputType) => {
    navigate(`/notebooks/${notebookId}/view/${type}`);
  }, [navigate, notebookId]);

  const handleOptionsConfirm = useCallback((options: GenerationOptions) => {
    if (!optionsType) return;
    const type = optionsType;
    setOptionsType(null);
    runGenerate(type, options);
  }, [optionsType, runGenerate]);

  const handleOpen = useCallback((type: AIOutputType) => {
    navigate(`/notebooks/${notebookId}/view/${type}`);
  }, [navigate, notebookId]);

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

  const handleOpenSource = useCallback((sourceId: string) => {
    navigate(`/notebooks/${notebookId}/source/${sourceId}`);
  }, [navigate, notebookId]);

  const studioProps = {
    outputs:        aiOutputs,
    isGenerating,
    generatingType: generatingType as import("@/types").AIOutputType | null,
    balance:        safeBalance,
    onGenerate:     handleGenerate,
    onOpen:         handleOpen,
    onTopUp:        () => setPaymentModalOpen(true),
    sources,
    onOpenSource:   handleOpenSource,
  };

  if (!notebookId) return null;

  return (
    <div className="h-full overflow-hidden flex flex-col">

      {/* ── No sources: show the upload / onboarding screen ───────────────── */}
      {sources.length === 0 && (
        <NotebookUploadScreen
          notebookId={notebookId}
          notebookTitle={activeNotebook?.title ?? "New Notebook"}
        />
      )}

      {/* ── Has sources: three-panel notebook view ────────────────────────── */}
      {sources.length > 0 && <>

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
            {id === "studio" && (isGenerating || (sources.length > 0 && aiOutputs.length === 0)) && (
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

        {/* Study timer shortcut */}
        <button
          onClick={() => navigate(`/study/timer?notebook=${notebookId}`)}
          className="flex items-center justify-center w-10 h-full border-l border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-1)] transition-colors shrink-0"
          title="Focus timer"
        >
          <Timer className="w-4 h-4" />
        </button>
      </div>

      {/* ── Onboarding progress steps (both mobile + desktop) ─────────────── */}
      {notebookId && (
        <NotebookProgressSteps
          notebookId={notebookId}
          hasSource={sources.length > 0}
          hasChat={chatMessages.length > 0}
          hasOutput={aiOutputs.length > 0}
        />
      )}

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

      {/* ── End of three-panel view ────────────────────────────────────────── */}
      </>}

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
