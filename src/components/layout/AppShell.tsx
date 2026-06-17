import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useTheme } from "@/hooks/useTheme";
import { useNotebooks } from "@/hooks/useNotebook";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { OfflineBanner } from "./OfflineBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { registerPush } from "@/lib/pushNotifications";
import { scheduleStreakReminder } from "@/lib/localNotifications";
import { PWAPrompt } from "./PWAPrompt";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { TokenBanner } from "@/components/payment/TokenBanner";
import { PaymentModal } from "@/components/payment/PaymentModal";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AnatomyAnnounceModal } from "@/components/ui/AnatomyAnnounceModal";

// ─── Global real-time notifications (challenges + friend requests) ─────────────

function GlobalNotifications() {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  // Helper: show chess challenge toast (used for new + missed challenges on reload)
  const showChessChallengToast = (game: any, challenger: { username: string | null; full_name: string | null } | null) => {
    const name = challenger?.username ? `@${challenger.username}` : challenger?.full_name ?? "Someone";
    const myColor = game.player1_color === "white" ? "Black" : "White";
    const timeLabel = game.time_control === "unlimited" ? "No timer" : game.time_control;
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
            ♟ {name} challenged you!
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
            You play {myColor} · {timeLabel}
          </p>
          <div className="flex gap-2 mt-0.5">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await supabase.from("chess_games").update({ status: "active" }).eq("id", game.id);
                navigate(`/break/chess/mp/${game.id}`);
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
            >
              Accept
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await supabase.from("chess_games").update({ status: "declined" }).eq("id", game.id);
              }}
              className="flex-1 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
            >
              Decline
            </button>
          </div>
        </div>
      ),
      {
        duration: 60000,
        style: { background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(56,224,195,0.22)", borderRadius: "14px", padding: "14px 16px" },
      },
    );
  };

  // Helper: show TTT invite toast
  const showTttInviteToast = (game: any, challenger: { username: string | null; full_name: string | null } | null) => {
    const name = challenger?.username ? `@${challenger.username}` : challenger?.full_name ?? "Someone";
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
            ✕○ {name} challenged you to Tic-tac-toe!
          </p>
          <div className="flex gap-2 mt-0.5">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await supabase.from("ttt_games").update({ status: "active" }).eq("id", game.id);
                navigate(`/break/ttt/${game.id}`);
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
            >
              Accept
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await supabase.from("ttt_games").update({ status: "declined" }).eq("id", game.id);
              }}
              className="flex-1 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
            >
              Decline
            </button>
          </div>
        </div>
      ),
      {
        duration: 60000,
        style: { background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "14px 16px" },
      },
    );
  };

  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;

    // On mount: fetch any pending challenges that arrived while offline/page was closed
    (async () => {
      const [{ data: pendingChess }, { data: pendingTtt }] = await Promise.all([
        supabase
          .from("chess_games")
          .select("id, user_id, player1_color, time_control, profiles!chess_games_user_id_fkey(username, full_name)")
          .eq("player2_id", userId)
          .eq("status", "waiting")
          .eq("game_type", "multiplayer"),
        supabase
          .from("ttt_games")
          .select("id, player_x_id, profiles!ttt_games_player_x_id_fkey(username, full_name)")
          .eq("player_o_id", userId)
          .eq("status", "waiting"),
      ]);

      (pendingChess ?? []).forEach((g: any) => {
        showChessChallengToast(g, g.profiles ?? null);
      });
      (pendingTtt ?? []).forEach((g: any) => {
        showTttInviteToast(g, g.profiles ?? null);
      });
    })();

    // Chess challenge toasts (new, live)
    const challengeCh = supabase
      .channel(`global-challenge-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "chess_games", filter: `player2_id=eq.${userId}` },
        async (payload: any) => {
          const game = payload.new;
          if (game.status !== "waiting") return;
          const { data: challenger } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", game.user_id)
            .maybeSingle();
          showChessChallengToast(game, challenger ?? null);
        },
      )
      .subscribe();

    // TTT invite toasts (new, live)
    const tttCh = supabase
      .channel(`global-ttt-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "ttt_games", filter: `player_o_id=eq.${userId}` },
        async (payload: any) => {
          const game = payload.new;
          if (game.status !== "waiting") return;
          const { data: challenger } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", game.player_x_id)
            .maybeSingle();
          showTttInviteToast(game, challenger ?? null);
        },
      )
      .subscribe();

    // Friend request toasts
    const friendCh = supabase
      .channel(`global-friends-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${userId}` },
        async (payload: any) => {
          const fr = payload.new;
          if (fr.status !== "pending") return;

          const { data: requester } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", fr.requester_id)
            .maybeSingle();

          const name = requester?.username ? `@${requester.username}` : requester?.full_name ?? "Someone";

          toast(
            (t) => (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
                  👋 {name} wants to be friends
                </p>
                <div className="flex gap-2 mt-0.5">
                  <button
                    onClick={async () => {
                      toast.dismiss(t.id);
                      await supabase.from("friendships").update({ status: "accepted" }).eq("id", fr.id);
                      toast.success(`You're now friends with ${name}!`);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      toast.dismiss(t.id);
                      await supabase.from("friendships").update({ status: "rejected" }).eq("id", fr.id);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ),
            {
              duration: 60000,
              style: { background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "14px 16px" },
            },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengeCh);
      supabase.removeChannel(tttCh);
      supabase.removeChannel(friendCh);
    };
  }, [profile?.id, navigate]);

  return null;
}

export function AppShell() {
  useTheme();
  useNotebooks();

  const location    = useLocation();
  const mainRef     = useRef<HTMLElement>(null);
  const tourFiredRef = useRef(false);
  const profile     = useAuthStore((s) => s.profile);
  const { startTour } = useTour();

  // Auto-start tour exactly once per browser session for first-time users.
  // tourFiredRef guards against profile updates re-triggering the effect.
  useEffect(() => {
    if (!profile || tourFiredRef.current) return;
    if (localStorage.getItem("studyai_tour_complete")) return;
    tourFiredRef.current = true;
    const timer = setTimeout(() => startTour(), 1200);
    return () => clearTimeout(timer);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native Android notification setup — runs once per session after auth resolves.
  // Push permission is only requested after the onboarding tour is done so the
  // system dialog has context. Streak reminder is safe to schedule unconditionally.
  useEffect(() => {
    if (!profile?.id) return;
    scheduleStreakReminder();
    if (localStorage.getItem("studyai_tour_complete")) {
      registerPush(profile.id);
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // /notebooks/:id pages manage their own layout (tab bar replaces navbar on mobile)
  const segments = location.pathname.split("/").filter(Boolean);
  const isNotebookView = segments[0] === "notebooks" && segments.length > 1;

  // Scroll the main content area back to the top on every route change
  useEffect(() => {
    if (!isNotebookView && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, isNotebookView]);

  return (
    <div
      className="relative flex h-dvh overflow-hidden"
      style={{ background: "#0a1628" }}>
      {/* Orb 1 mobile — tight to top-left corner */}
      <div
        className="md:hidden"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.12)",
          top: "-260px",
          left: "-200px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 1 desktop — pulled inward so more glow is visible */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.12)",
          top: "-80px",
          left: "-60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 2 — mobile: right side ~55% down */}
      <div
        className="md:hidden"
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(99, 179, 255, 0.08)",
          top: "55%",
          right: "-80px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 2 — desktop: bottom-right */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "380px",
          height: "380px",
          borderRadius: "50%",
          background: "rgba(99, 179, 255, 0.08)",
          bottom: "-80px",
          right: "-60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 3 — mint, center (desktop only) */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.05)",
          top: "45%",
          right: "28%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Desktop sidebar */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Sidebar />
      </div>

      {/* Main content area */}
      <div
        className="relative flex flex-col flex-1 min-w-0 overflow-x-hidden"
        style={{ zIndex: 1 }}>
        {/* Network/token/update banners */}
        <UpdateBanner />
        <OfflineBanner />
        <TokenBanner />

        {/* Top navbar */}
        <Navbar />

        {/* Page content */}
        <main
          ref={mainRef}
          className={
            isNotebookView
              ? "flex-1 overflow-hidden relative"
              : "flex-1 overflow-y-auto scrollbar-thin relative"
          }
          style={
            !isNotebookView
              ? {
                  paddingBottom:
                    "calc(5rem + env(safe-area-inset-bottom, 0px))",
                }
              : undefined
          }>
          <div className={isNotebookView ? "h-full" : "min-h-full"}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden inside a specific notebook */}
      {!isNotebookView && <MobileNav />}

      {/* Global overlays */}
      <GlobalNotifications />
      <AnatomyAnnounceModal />
      <CommandPalette />
      <PaymentModal />
      <PWAPrompt />
      <PushNotificationPrompt />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "!bg-surface-1 !text-text-primary !border !border-border !shadow-md !rounded-xl !text-sm",
          duration: 4000,
        }}
      />
    </div>
  );
}
