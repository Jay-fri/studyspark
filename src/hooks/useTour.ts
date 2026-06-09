import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { supabase } from "@/services/supabase";

const TOUR_KEY = "studyai_tour_complete";

// Module-level ref so NotebooksPage and NotebookPage can drive the tour
export const activeTour = {
  isActive: false,
  moveNext: () => {},
  // Set before a force-click tab step; cleared after the user clicks that tab
  pendingTab: null as "sources" | "chat" | "studio" | null,
};

function isRendered(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

export function useTour() {
  const navigate = useNavigate();

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
      Element.prototype.scrollIntoView = origScrollIntoView;
      document.documentElement.style.overflow = savedHtmlOverflow;
      document.body.style.overflow = savedBodyOverflow;
      localStorage.setItem(TOUR_KEY, "true");
    };

    const skipIfHidden = (selector: string) => () => {
      if (!isRendered(selector)) setTimeout(() => driverObj.moveNext(), 0);
    };

    // Creates "Getting Started" notebook if needed, then navigates to /notebooks list
    const ensureDemoNotebook = async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        navigate("/notebooks");
        setTimeout(() => driverObj.moveNext(), 800);
        return;
      }

      const existing = useNotebookStore.getState().notebooks[0];
      if (existing) {
        navigate("/notebooks");
        setTimeout(() => driverObj.moveNext(), 800);
        return;
      }

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

        if (nb) {
          useNotebookStore.getState().addNotebook(nb);
          navigate("/notebooks");
          setTimeout(() => driverObj.moveNext(), 1000);
        } else {
          navigate("/notebooks");
          setTimeout(() => driverObj.moveNext(), 800);
        }
      } catch {
        navigate("/notebooks");
        setTimeout(() => driverObj.moveNext(), 800);
      }
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
            "Chat",
            "👆 Tap Chat to ask the AI questions about your sources.",
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
            "Studio",
            "👆 Tap Studio to generate quizzes, flashcards, summaries, and more.",
            "studio",
          ),
          {
            element: "#tour-generate-card",
            popover: {
              title: "One-tap study tools",
              description:
                "Tap any card to generate that study tool from your sources instantly — quiz, flashcards, podcast, mind map.",
              side: "top",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-generate-card"),
          },
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
            // Going back from the first desktop interior step returns to the notebooks list
            onPrevClick: () => {
              navigate("/notebooks");
              setTimeout(() => driverObj.movePrev(), 800);
            },
          },
          {
            element: "#tour-chat-input",
            popover: {
              title: "Chat with your sources",
              description:
                'Ask "summarise this", "key concepts?" or any question — answered only from your uploaded materials.',
              side: "top",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-chat-input"),
          },
          {
            element: "#tour-generate-card",
            popover: {
              title: "Studio — generate study tools",
              description:
                "Tap any card to generate quizzes, flashcards, summaries, mind maps, or podcast scripts instantly.",
              side: "top",
              align: "start",
            },
            onHighlightStarted: skipIfHidden("#tour-generate-card"),
          },
        ];

    driverObj = driver({
      animate: true,
      smoothScroll: false,
      allowClose: true,
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
            title: "Welcome to StudyAI 👋",
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

        // ── 6. Bridge: open notebooks ────────────────────────────────────────
        // Centered popover — navigates to /notebooks list on "Got it →"
        {
          popover: {
            title: "Now let's open a notebook",
            description:
              "We'll walk you through the core features inside a notebook — sources, chat, and studio.",
          },
          onNextClick: () => {
            ensureDemoNotebook();
          },
        },

        // ── 7. Demo notebook card — user must tap to open ────────────────────
        {
          element: "#tour-notebook-demo-card",
          popover: {
            title: "Your first notebook 📚",
            description: "👆 Tap this notebook to open it.",
            showButtons: ["close"],
          },
          onHighlightStarted: skipIfHidden("#tour-notebook-demo-card"),
          onHighlighted: () => {
            const el = document.querySelector("#tour-notebook-demo-card");
            if (el) el.classList.remove("driver-no-interaction");
          },
        },

        // ── 8–13 (mobile) or 8–10 (desktop): notebook interior ──────────────
        ...notebookInteriorSteps,

        // ── Done ─────────────────────────────────────────────────────────────
        {
          popover: {
            title: "You're all set 🎉",
            description:
              "Upload a lecture note or PDF to your notebook and let StudyAI turn it into quizzes, flashcards, and summaries.",
          },
        },
      ],
    });

    activeTour.isActive = true;
    activeTour.moveNext = () => driverObj.moveNext();

    driverObj.drive();
  };

  return { startTour };
}
