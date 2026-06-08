import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import {
  Search,
  BookMarked,
  FileText,
  Sparkles,
  LayoutDashboard,
  Library,
  Settings,
  X,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useNotebookStore } from "@/stores/notebookStore";
import type { Notebook, Source, AIOutput } from "@/types";

interface SearchItem {
  id:       string;
  title:    string;
  subtitle: string;
  group:    "Notebooks" | "Sources" | "AI Outputs" | "Pages";
  href:     string;
  icon:     React.ReactNode;
}

const STATIC_PAGES: SearchItem[] = [
  { id: "dashboard",  title: "Dashboard",  subtitle: "Overview",        group: "Pages", href: "/dashboard",  icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "notebooks",  title: "Notebooks",  subtitle: "Your notebooks",   group: "Pages", href: "/notebooks",  icon: <BookMarked className="w-4 h-4" /> },
  { id: "library",    title: "Library",    subtitle: "AI outputs",       group: "Pages", href: "/library",    icon: <Library className="w-4 h-4" /> },
  { id: "settings",   title: "Settings",   subtitle: "Account settings", group: "Pages", href: "/settings",   icon: <Settings className="w-4 h-4" /> },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const navigate  = useNavigate();
  const inputRef  = useRef<HTMLInputElement>(null);

  const notebooks  = useNotebookStore((s) => s.notebooks);
  const sources    = useNotebookStore((s) => s.sources);
  const aiOutputs  = useNotebookStore((s) => s.aiOutputs);

  // Build flat search corpus
  const corpus = useMemo<SearchItem[]>(() => {
    const nbs: SearchItem[] = notebooks.map((nb: Notebook) => ({
      id:       nb.id,
      title:    `${nb.emoji} ${nb.title}`,
      subtitle: nb.description ?? "Notebook",
      group:    "Notebooks",
      href:     `/notebooks/${nb.id}`,
      icon:     <BookMarked className="w-4 h-4" />,
    }));

    const srcs: SearchItem[] = sources.map((src: Source) => ({
      id:       src.id,
      title:    src.title,
      subtitle: src.type.toUpperCase(),
      group:    "Sources",
      href:     `/notebooks/${src.notebook_id}`,
      icon:     <FileText className="w-4 h-4" />,
    }));

    const ais: SearchItem[] = aiOutputs.map((ao: AIOutput) => {
      const nb = notebooks.find((n: Notebook) => n.id === ao.notebook_id);
      return {
        id:       ao.id,
        title:    `${ao.type.charAt(0).toUpperCase() + ao.type.slice(1)}`,
        subtitle: nb?.title ?? "Unknown notebook",
        group:    "AI Outputs",
        href:     `/notebooks/${ao.notebook_id}`,
        icon:     <Sparkles className="w-4 h-4" />,
      };
    });

    return [...STATIC_PAGES, ...nbs, ...srcs, ...ais];
  }, [notebooks, sources, aiOutputs]);

  const fuse = useMemo(
    () =>
      new Fuse(corpus, {
        keys:              ["title", "subtitle"],
        threshold:         0.4,
        includeScore:      true,
        minMatchCharLength: 1,
      }),
    [corpus]
  );

  const close = () => setCommandPaletteOpen(false);

  const navigate_ = (href: string) => {
    navigate(href);
    close();
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-lg bg-surface-0 border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Command
              label="Search"
              filter={(value, search) => {
                if (!search) return 1;
                const results = fuse.search(search);
                const hit = results.find((r) => r.item.id === value);
                return hit ? 1 - (hit.score ?? 0) : 0;
              }}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <Command.Input
                  ref={inputRef}
                  placeholder="Search notebooks, sources, pages…"
                  className="flex-1 py-4 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <button
                  onClick={close}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-8 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                {(["Pages", "Notebooks", "Sources", "AI Outputs"] as const).map((group) => {
                  const items = corpus.filter((c) => c.group === group);
                  if (items.length === 0) return null;
                  return (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={item.id}
                          onSelect={() => navigate_(item.href)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors aria-selected:bg-brand-primary/10 aria-selected:text-brand-primary hover:bg-surface-1 text-text-secondary"
                        >
                          <span className="text-text-muted">{item.icon}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-text-primary truncate">
                              {item.title}
                            </span>
                            <span className="block text-xs text-text-muted truncate">
                              {item.subtitle}
                            </span>
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer hint */}
              <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-border bg-surface-1">
                <span className="text-[11px] text-text-muted">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-0 text-[10px] font-mono">↑↓</kbd>
                  {" "}navigate
                </span>
                <span className="text-[11px] text-text-muted">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-0 text-[10px] font-mono">↵</kbd>
                  {" "}select
                </span>
                <span className="text-[11px] text-text-muted">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-0 text-[10px] font-mono">esc</kbd>
                  {" "}close
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
