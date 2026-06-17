import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { supabase } from "@/services/supabase";

const TOUR_KEY = "studyai_tour_complete";

// Module-level ref so NotebooksPage and NotebookPage can drive the tour
export const activeTour = {
  isActive: false,
  moveNext: () => {},
  pendingTab: null as "sources" | "chat" | "studio" | null,
  // Set while the tour is on the "click Notebooks nav" step
  pendingNotebooksNav: false,
  // Exposed so Sidebar/MobileNav onClick can poll until the demo card renders
  waitForThenNext: (_selector: string, _maxMs?: number) => {},
};

function isRendered(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

export function useTour() {
  const startTour = () => {
    const isMobile = window.innerWidth < 768;

    const home = isMobile ? "#tour-nav-home" : "#tour-sidebar-home";
    const library = isMobile ? "#tour-nav-library" : "#tour-sidebar-library";
    const profile = isMobile ? "#tour-nav-profile" : "#tour-sidebar-settings";
    const tokenBadge = isMobile
      ? "#tour-token-badge-dashboard"
      : "#tour-token-badge";

    // ── Smart scrollIntoView: centres the element in the safe zone ────────────
    const origScrollIntoView = Element.prototype.scrollIntoView;
    (Element.prototype as any).scrollIntoView = function (this: Element) {
      const el = this as HTMLElement;
      const mainEl = document.querySelector<HTMLElement>("main");
      if (!mainEl || !mainEl.contains(el)) return;

      const NAVBAR = 56;
      const BOTTOM = window.innerWidth < 768 ? 68 : 0;
      const PADDING = 20;

      const elRect = el.getBoundingClientRect();
      const safeTop = NAVBAR + PADDING;
      const safeBot = window.innerHeight - BOTTOM - PADDING;

      if (elRect.top >= safeTop && elRect.bottom <= safeBot) return;

      const safeCenter = (safeTop + safeBot) / 2;
      const elCenter = (elRect.top + elRect.bottom) / 2;
      mainEl.scrollTop = Math.max(
        0,
        mainEl.scrollTop + (elCenter - safeCenter),
      );
    };

    const savedHtmlOverflow = document.documentElement.style.overflow;
    const savedBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const mainEl = document.querySelector<HTMLElement>("main");
    if (mainEl) mainEl.scrollTop = 0;

    let driverObj: ReturnType<typeof driver>;

    const teardown = () => {
      activeTour.isActive = false;
      activeTour.moveNext = () => {};
      activeTour.pendingTab = null;
      activeTour.pendingNotebooksNav = false;
      activeTour.waitForThenNext = () => {};
      Element.prototype.scrollIntoView = origScrollIntoView;
      document.documentElement.style.overflow = savedHtmlOverflow;
      document.body.style.overflow = savedBodyOverflow;
      localStorage.setItem(TOUR_KEY, "true");
      window.dispatchEvent(new CustomEvent("studylm-tour-complete"));
    };

    const skipIfHidden = (selector: string) => () => {
      if (!isRendered(selector)) setTimeout(() => driverObj.moveNext(), 0);
    };

    // Polls until selector is rendered, then advances to the next step (max ~4 s)
    const waitForElementThenNext = (selector: string, maxMs = 4000) => {
      const interval = 80;
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += interval;
        if (isRendered(selector) || elapsed >= maxMs) {
          clearInterval(poll);
          // Wait for Framer Motion spring to fully settle before driver.js measures position
          setTimeout(() => {
            const popoverEl = document.querySelector('.driver-popover');
            if (popoverEl) (popoverEl as HTMLElement).style.opacity = '1';
            driverObj.moveNext();
          }, 400);
        }
      }, interval);
    };

    // Creates "Getting Started" notebook if the user has none — no navigation.
    // Called while the Notebooks nav step is shown so it's ready before the user clicks.
    const createDemoNotebookIfNeeded = async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      if (useNotebookStore.getState().notebooks.length > 0) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: nb } = await (supabase.from("notebooks") as any)
          .insert({
            user_id: userId,
            title: "Getting Started",
            emoji: "📚",
            description: "Your first notebook — created during onboarding.",
            color: "#38E0C3",
          })
          .select()
          .single();
        if (nb) useNotebookStore.getState().addNotebook(nb);
      } catch { /* silent — user will see empty state on /notebooks */ }
    };

    // ── Force-click tab step helper ──────────────────────────────────────────
    // Shows only the X button; removes pointer-events:none so the tab is tappable.
    // NotebookPage checks activeTour.pendingTab on each tab click to advance the tour.
    const forceTabStep = (
      selector: string,
      title: string,
      description: string,
      tab: "sources" | "chat" | "studio",
    ): DriveStep => ({
      element: selector,
      popover: {
        title,
        description,
        showButtons: ["close"],
      },
      onHighlightStarted: skipIfHidden(selector),
      onHighlighted: () => {
        activeTour.pendingTab = tab;
        const el = document.querySelector(selector);
        if (el) el.classList.remove("driver-no-interaction");
      },
    });

    // ── Individual studio feature steps (shared between mobile + desktop) ───────
    const studioFeatureSteps: DriveStep[] = [
      {
        element: "#tour-studio-summary",
        popover: {
          title: "📝 Summary",
          description: "Generates a concise overview of everything in your sources — great for quick revision.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-summary"),
      },
      {
        element: "#tour-studio-quiz",
        popover: {
          title: "❓ Quiz",
          description: "Creates multiple-choice questions from your materials to test what you actually know.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-quiz"),
      },
      {
        element: "#tour-studio-flashcards",
        popover: {
          title: "🃏 Flashcards",
          description: "Spaced-repetition cards pulled from your sources — study smarter, not harder.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-flashcards"),
      },
      {
        element: "#tour-studio-mindmap",
        popover: {
          title: "🗺️ Mind Map",
          description: "A visual map of how concepts connect — great for understanding complex topics at a glance.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-mindmap"),
      },
      {
        element: "#tour-studio-studyguide",
        popover: {
          title: "📖 Study Guide",
          description: "A structured, chapter-style guide through your materials — ideal for deep understanding.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-studyguide"),
      },
      {
        element: "#tour-studio-keyconcepts",
        popover: {
          title: "💡 Key Concepts",
          description: "Extracts the core terms and definitions from your sources into a clean reference list.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-keyconcepts"),
      },
      {
        element: "#tour-studio-podcast",
        popover: {
          title: "🎙️ Podcast",
          description: "Turns your notes into a conversational dialogue script — listen and learn on the go.",
        },
        onHighlightStarted: skipIfHidden("#tour-studio-podcast"),
      },
    ];

    // ── Notebook interior steps — diverge per device ─────────────────────────
    // Mobile: user taps each tab to switch panels; we force-click each tab first.
    // Desktop: all three panels visible at once; just highlight each in order.
    const notebookInteriorSteps: DriveStep[] = isMobile
      ? [
          forceTabStep(
            "#tour-sources-tab",
            "Sources",
            "👆 Tap Sources to add your study materials — PDFs, YouTube links, or plain text.",
            "sources",
          ),
          {
            element: "#tour-upload-zone",
            popover: {
              title: "Add your materials",
              description:
                "Upload a PDF, paste a YouTube link, or drop any document. The AI reads everything you add.",
              side: "bottom",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-upload-zone"),
          },
          forceTabStep(
            "#tour-chat-tab",
            "Chat AI",
            "👆 Tap Chat AI to ask questions about your sources.",
            "chat",
          ),
          {
            element: "#tour-chat-input",
            popover: {
              title: "Ask anything",
              description:
                'Type "summarise this", "key concepts?", or any question — answered only from your uploaded materials.',
              side: "top",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-chat-input"),
          },
          forceTabStep(
            "#tour-study-tab",
            "Generate",
            "👆 Tap Generate to create quizzes, flashcards, summaries, and more.",
            "studio",
          ),
          ...studioFeatureSteps,
        ]
      : [
          {
            element: "#tour-upload-zone",
            popover: {
              title: "Sources — add your materials",
              description:
                "Upload PDFs, paste links, or drop YouTube videos here. The AI reads everything you add.",
              side: "right",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-upload-zone"),
          } as DriveStep,
          {
            element: "#tour-chat-input",
            popover: {
              title: "Chat AI — ask your sources",
              description:
                'Ask "summarise this", "key concepts?" or any question — answered only from your uploaded materials.',
              side: "top",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-chat-input"),
          },
          ...studioFeatureSteps,
        ];

    driverObj = driver({
      animate: true,
      smoothScroll: false,
      allowClose: false,
      disableActiveInteraction: true,
      overlayOpacity: 0.9,
      stagePadding: 10,
      stageRadius: 12,
      popoverOffset: 16,
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Got it →",
      prevBtnText: "← Back",
      doneBtnText: "Let's go 🎉",
      onDestroyStarted: () => {
        teardown();
        driverObj.destroy();
      },

      steps: [
        // ── 1. Welcome ───────────────────────────────────────────────────────
        {
          popover: {
            title: "Welcome to StudyLM 👋",
            description:
              'Your AI-powered study companion. Tap "Got it →" for a quick tour.',
          },
        },

        // ── 2. Dashboard nav ─────────────────────────────────────────────────
        {
          element: home,
          popover: {
            title: "Dashboard",
            description:
              "Your home base — recent notebooks, activity, and token balance.",
            side: isMobile ? "bottom" : "right",
            align: "start",
          },
          onHighlightStarted: skipIfHidden(home),
        },

        // ── 3. Token balance ─────────────────────────────────────────────────
        {
          element: tokenBadge,
          popover: {
            title: "Your AI Tokens",
            description:
              "You start with 1,000 free tokens. Every AI action costs a few — top up anytime for ₦2,000.",
            side: "top",
            align: "start",
          },
          onHighlightStarted: skipIfHidden(tokenBadge),
        },

        // ── 4. Library nav ───────────────────────────────────────────────────
        {
          element: library,
          popover: {
            title: "Your Library",
            description:
              "Every quiz, flashcard set, summary, and study guide you generate lives here — across all notebooks.",
            side: isMobile ? "top" : "right",
            align: "start",
          },
          onHighlightStarted: skipIfHidden(library),
        },

        // ── 4b. Break Room nav ───────────────────────────────────────────────
        {
          element: "#tour-break-room",
          popover: {
            title: "Break Room 🎮",
            description:
              "Need a breather? Play Chess or Scrabble. Your games save automatically so you can pick up any time. Use 20 tokens for an AI review of your game.",
            side: isMobile ? "top" : "right",
            align: "start",
          },
          onHighlightStarted: skipIfHidden("#tour-break-room"),
        },

        // ── 5. Profile & Settings nav ────────────────────────────────────────
        {
          element: profile,
          popover: {
            title: "Profile & Settings",
            description:
              "Change your name, university, font size, and preferences. Replay this tour here anytime.",
            side: isMobile ? "top" : "right",
            align: "start",
          },
          onHighlightStarted: skipIfHidden(profile),
        },

        // ── 6. Force-click: Notebooks nav ────────────────────────────────────
        // User must tap the Notebooks link themselves; clicking it navigates via
        // React Router NavLink. Sidebar/MobileNav onClick then calls waitForThenNext.
        {
          element: isMobile ? "#tour-nav-notebooks" : "#tour-sidebar-notebooks",
          popover: {
            title: "Open Notebooks",
            description: "👆 Tap Notebooks to continue the tour.",
            showButtons: ["close"],
            side: isMobile ? "top" : "right",
            align: "start",
          },
          onHighlightStarted: skipIfHidden(isMobile ? "#tour-nav-notebooks" : "#tour-sidebar-notebooks"),
          onHighlighted: () => {
            activeTour.pendingNotebooksNav = true;
            createDemoNotebookIfNeeded();
            const sel = isMobile ? "#tour-nav-notebooks" : "#tour-sidebar-notebooks";
            const el = document.querySelector(sel);
            if (el) el.classList.remove("driver-no-interaction");
          },
        },

        // ── 7. Demo notebook card — user must tap to open ────────────────────
        {
          element: "#tour-notebook-demo-card",
          popover: {
            title: "Your first notebook 📚",
            description: "👆 Tap this notebook to open it.",
            showButtons: ["close"],
            side: "bottom",
            align: "start",
          },
          onHighlightStarted: skipIfHidden("#tour-notebook-demo-card"),
          onHighlighted: () => {
            const el = document.querySelector("#tour-notebook-demo-card");
            if (el) el.classList.remove("driver-no-interaction");
          },
          onDeselected: () => {
            const el = document.querySelector<HTMLElement>("#tour-notebook-demo-card");
            if (el) el.style.pointerEvents = "";
          },
          allowClick: true,
        } as any,

        // ── 8–13 (mobile) or 8–10 (desktop): notebook interior ──────────────
        ...notebookInteriorSteps,

        // ── Done ─────────────────────────────────────────────────────────────
        {
          popover: {
            title: "You're all set 🎉",
            description:
              "Upload a lecture note or PDF to your notebook and let StudyLM turn it into quizzes, flashcards, and summaries.",
          },
        },
      ],
    });

    activeTour.isActive = true;
    activeTour.moveNext = () => driverObj.moveNext();
    activeTour.waitForThenNext = waitForElementThenNext;

    driverObj.drive();
  };

  return { startTour };
}
