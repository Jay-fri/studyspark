import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useBackGuard, QuitGameModal } from "@/hooks/useBackGuard";
import { Chessboard } from "react-chessboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Square } from "chess.js";
import { useChess, type Difficulty } from "@/hooks/useChess";
import { useMultiplayerChess } from "@/hooks/useMultiplayerChess";
import { useChessSound } from "@/hooks/useChessSound";
import { ChessMoveHistory } from "@/components/games/ChessMoveHistory";
import { ChessAIReview } from "@/components/games/ChessAIReview";
import { ChessResultModal, type GameOverInfo } from "@/components/games/ChessResultModal";
import { supabase, deductTokens } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SetupColor = "white" | "black" | "random";
type TimeKey = "unlimited" | "1+0" | "3+0" | "5+0" | "10+0" | "15+0";
type SetupMode = "ai" | "friend";

interface GameSetup {
  mode: SetupMode;
  color: SetupColor;
  difficulty: Difficulty;
  botId: string;
  botName: string;
  timeKey: TimeKey;
}

const TIME_OPTIONS: { key: TimeKey; label: string; sub: string; minutes: number | null }[] = [
  { key: "unlimited", label: "∞", sub: "No limit", minutes: null },
  { key: "1+0", label: "1", sub: "Bullet", minutes: 1 },
  { key: "3+0", label: "3", sub: "Blitz", minutes: 3 },
  { key: "5+0", label: "5", sub: "Blitz", minutes: 5 },
  { key: "10+0", label: "10", sub: "Rapid", minutes: 10 },
  { key: "15+0", label: "15", sub: "Rapid", minutes: 15 },
];

interface BotProfile {
  id: string;
  name: string;
  title: string;
  emoji: string;
  difficulty: Difficulty;
  elo: number;
  style: string;
}

const BOTS: BotProfile[] = [
  { id: "studybot", name: "StudyBot",    title: "Beginner Bot",   emoji: "🤖", difficulty: "easy",       elo: 400,  style: "Random moves"     },
  { id: "pawn",     name: "Pawn Pusher", title: "Casual Player",  emoji: "♟",  difficulty: "medium",     elo: 700,  style: "Basic tactics"    },
  { id: "knight",   name: "Sir Knight",  title: "Club Player",    emoji: "♞",  difficulty: "hard",       elo: 1100, style: "Solid defense"    },
  { id: "levy",     name: "GothamChess", title: "IM Levy Rozman", emoji: "📺", difficulty: "extra_hard", elo: 1500, style: "Aggressive play"  },
  { id: "polgar",   name: "Judith P.",   title: "GM Legend",      emoji: "♛",  difficulty: "extra_hard", elo: 1900, style: "Tactical mastery" },
  { id: "studylm",  name: "StudyLM AI",  title: "AI Coach",       emoji: "🧠", difficulty: "super_hard", elo: 2100, style: "Deep analysis"    },
  { id: "hikaru",   name: "Hikaru",      title: "Super GM",       emoji: "⚡", difficulty: "super_hard", elo: 2300, style: "Speed tactics"    },
  { id: "magnus",   name: "Magnus",      title: "World Champion", emoji: "👑", difficulty: "super_hard", elo: 2500, style: "Universal play"   },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms: number | null): string {
  if (ms === null) return "∞";
  const total = Math.max(0, ms);
  if (total < 20000) {
    const s = Math.floor(total / 1000);
    const t = Math.floor((total % 1000) / 100);
    return `${s}.${t}`;
  }
  const secs = Math.ceil(total / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ChessClock({
  ms,
  label,
  isActive,
  elo,
  avatarUrl,
}: {
  ms: number | null;
  label: string;
  isActive: boolean;
  elo?: number;
  avatarUrl?: string | null;
}) {
  const isLow = ms !== null && ms > 0 && ms < 30000;
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-xl transition-all"
      style={{
        background: isActive ? "rgba(56,224,195,0.08)" : "rgba(255,255,255,0.04)",
        border: `0.5px solid ${isActive ? "rgba(56,224,195,0.22)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0"
            style={{ border: "0.5px solid rgba(255,255,255,0.12)" }} />
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 select-none"
            style={{ background: "rgba(56,224,195,0.12)", color: "#38E0C3", border: "0.5px solid rgba(56,224,195,0.2)" }}>
            {label[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          {label}
        </span>
        {elo !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md tabular-nums"
            style={{ background: "rgba(56,224,195,0.07)", color: "rgba(56,224,195,0.65)" }}>
            {elo}
          </span>
        )}
      </div>
      <span
        className="font-mono text-lg font-medium tabular-nums"
        style={{
          color: isLow ? "#F97316" : isActive ? "#38E0C3" : "rgba(255,255,255,0.6)",
        }}
      >
        {formatTime(ms)}
      </span>
    </div>
  );
}

function OptionBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-sm transition-all"
      style={{
        background: active ? "rgba(56,224,195,0.12)" : "rgba(255,255,255,0.04)",
        border: `0.5px solid ${active ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
        color: active ? "#38E0C3" : "rgba(255,255,255,0.55)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Challenge Setup Modal ─────────────────────────────────────────────────────

function ChallengeSetupModal({
  friend,
  color,
  setColor,
  timeKey,
  setTimeKey,
  isSending,
  onSend,
  onCancel,
}: {
  friend: FriendEntry;
  color: SetupColor;
  setColor: (c: SetupColor) => void;
  timeKey: TimeKey;
  setTimeKey: (k: TimeKey) => void;
  isSending: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,40,0.85)", backdropFilter: "blur(14px)", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget && !isSending) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: "rgba(17,29,48,0.99)", border: "0.5px solid rgba(56,224,195,0.22)" }}
      >
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>
            Challenge
          </p>
          <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>
            @{friend.username}
          </p>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            You play as
          </p>
          <div className="flex gap-2">
            {(
              [
                { key: "white" as SetupColor, icon: "♔", label: "White" },
                { key: "black" as SetupColor, icon: "♚", label: "Black" },
                { key: "random" as SetupColor, icon: "🎲", label: "Random" },
              ]
            ).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setColor(key)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: color === key ? "rgba(56,224,195,0.12)" : "rgba(255,255,255,0.04)",
                  border: `0.5px solid ${color === key ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: color === key ? "#38E0C3" : "rgba(255,255,255,0.55)",
                }}
              >
                <span className="block text-base leading-none mb-0.5">{icon}</span>
                <span className="block text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time control */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Time control
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map(({ key, label, sub }) => (
              <button
                key={key}
                onClick={() => setTimeKey(key)}
                className="py-2 rounded-xl text-sm transition-all"
                style={{
                  background: timeKey === key ? "rgba(56,224,195,0.12)" : "rgba(255,255,255,0.04)",
                  border: `0.5px solid ${timeKey === key ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: timeKey === key ? "#38E0C3" : "rgba(255,255,255,0.55)",
                }}
              >
                <span className="block font-medium text-sm leading-none mb-0.5">{label}</span>
                <span className="block text-[9px] opacity-60">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={isSending}
            className="flex-1 py-3 rounded-xl text-sm transition-all disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: "rgba(56,224,195,0.15)",
              border: "0.5px solid rgba(56,224,195,0.4)",
              color: "#38E0C3",
            }}
          >
            {isSending ? "Sending…" : "Send Challenge"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Friend Search Panel ───────────────────────────────────────────────────────

interface FriendEntry {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  chess_elo?: number;
  friendship_id?: string;
}

interface PendingChallenge {
  id: string;
  user_id: string;
  challenger_username: string | null;
  created_at: string;
}

function FriendSearchPanel({
  onChallenge,
  profile,
}: {
  onChallenge: (friend: FriendEntry, color: SetupColor, timeKey: TimeKey) => void;
  profile: Profile | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"friends" | "search" | "requests" | "challenges">("friends");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<FriendEntry | null>(null);
  const [challengeColor, setChallengeColor] = useState<SetupColor>("random");
  const [challengeTimeKey, setChallengeTimeKey] = useState<TimeKey>("unlimited");
  const [isSending, setIsSending] = useState(false);

  const { data: friends = [] } = useQuery<FriendEntry[]>({
    queryKey: ["friends", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friends", { p_user_id: profile!.id });
      return (data ?? []).map((f: any) => ({
        id: f.friend_id,
        username: f.username,
        full_name: f.full_name,
        avatar_url: f.avatar_url,
        chess_elo: f.chess_elo ?? 1000,
        friendship_id: f.friendship_id,
      }));
    },
    enabled: !!profile?.id,
  });

  const { data: pendingChallenges = [], refetch: refetchChallenges } = useQuery<PendingChallenge[]>({
    queryKey: ["pending-chess-challenges", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chess_games")
        .select("id, user_id, created_at, profiles!chess_games_user_id_fkey(username)")
        .eq("player2_id", profile!.id)
        .eq("status", "waiting")
        .eq("game_type", "multiplayer")
        .order("created_at", { ascending: false });
      return (data ?? []).map((g: any) => ({
        id: g.id,
        user_id: g.user_id,
        challenger_username: g.profiles?.username ?? "Unknown",
        created_at: g.created_at,
      }));
    },
    enabled: !!profile?.id,
    refetchInterval: 5000,
  });

  const { data: pendingOutgoing = [] } = useQuery({
    queryKey: ["pending-friendships", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("addressee_id")
        .eq("requester_id", profile!.id)
        .eq("status", "pending");
      return (data ?? []).map((f: any) => f.addressee_id as string);
    },
    enabled: !!profile?.id,
  });

  const { data: receivedRequests = [], refetch: refetchReceived } = useQuery<
    { id: string; requester_id: string; username: string | null; full_name: string | null }[]
  >({
    queryKey: ["friend-requests-received", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, requester_id, profiles!friendships_requester_id_fkey(username, full_name)")
        .eq("addressee_id", profile!.id)
        .eq("status", "pending");
      return (data ?? []).map((f: any) => ({
        id: f.id,
        requester_id: f.requester_id,
        username: f.profiles?.username ?? null,
        full_name: f.profiles?.full_name ?? null,
      }));
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  });

  const { data: sentRequests = [], refetch: refetchSent } = useQuery<
    { id: string; addressee_id: string; username: string | null; full_name: string | null }[]
  >({
    queryKey: ["friend-requests-sent", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, addressee_id, profiles!friendships_addressee_id_fkey(username, full_name)")
        .eq("requester_id", profile!.id)
        .eq("status", "pending");
      return (data ?? []).map((f: any) => ({
        id: f.id,
        addressee_id: f.addressee_id,
        username: f.profiles?.username ?? null,
        full_name: f.profiles?.full_name ?? null,
      }));
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  });

  // When the other person accepts our friend request, refresh the friends list in real-time
  useEffect(() => {
    if (!profile?.id) return;
    const ch = supabase
      .channel(`friend-accepted-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships", filter: `requester_id=eq.${profile.id}` },
        (payload: any) => {
          if (payload.new?.status === "accepted") {
            qc.invalidateQueries({ queryKey: ["friends", profile.id] });
            qc.invalidateQueries({ queryKey: ["friend-requests-sent", profile.id] });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  const handleSearch = async () => {
    if (!query.trim() || !profile) return;
    setSearching(true);
    try {
      const { data } = await supabase.rpc("search_users_by_username", {
        p_query: query.trim(),
        p_user_id: profile.id,
        p_limit: 8,
      });
      setSearchResults(
        (data ?? []).map((u: any) => ({
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          chess_elo: u.chess_elo ?? 1000,
        })),
      );
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!profile) return;
    setAddingId(userId);
    try {
      await supabase.from("friendships").insert({
        requester_id: profile.id,
        addressee_id: userId,
      });
      toast.success("Friend request sent!");
    } catch {
      toast.error("Couldn't send request");
    } finally {
      setAddingId(null);
    }
  };

  const handleAcceptChallenge = async (gameId: string) => {
    await supabase.from("chess_games").update({ status: "active" }).eq("id", gameId);
    refetchChallenges();
    navigate(`/break/chess/mp/${gameId}`);
  };

  const handleDeclineChallenge = async (gameId: string) => {
    await supabase.from("chess_games").update({ status: "declined" }).eq("id", gameId);
    refetchChallenges();
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    refetchReceived();
  };

  const handleDeleteFriendship = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    refetchReceived();
    refetchSent();
  };

  const TabBtn = ({ id, label, badge }: { id: "friends" | "search" | "requests" | "challenges"; label: string; badge?: number }) => (
    <button
      onClick={() => setTab(id)}
      className="flex-1 py-2 text-xs font-medium rounded-lg transition-all relative"
      style={{
        background: tab === id ? "rgba(56,224,195,0.1)" : "transparent",
        color: tab === id ? "#38E0C3" : "rgba(255,255,255,0.4)",
        border: `0.5px solid ${tab === id ? "rgba(56,224,195,0.2)" : "transparent"}`,
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center"
          style={{ background: "#F97316", color: "#fff" }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  function UserRow({
    user,
    action,
  }: {
    user: FriendEntry;
    action: React.ReactNode;
  }) {
    return (
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm select-none"
            style={{
              background: "rgba(56,224,195,0.12)",
              color: "#38E0C3",
              border: "0.5px solid rgba(56,224,195,0.2)",
            }}
          >
            {(user.username ?? user.full_name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                @{user.username}
              </p>
              {user.chess_elo !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{ background: "rgba(56,224,195,0.08)", color: "rgba(56,224,195,0.8)" }}>
                  {user.chess_elo}
                </span>
              )}
            </div>
            {user.full_name && (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {user.full_name}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
    );
  }

  return (
    <>
    {challengeTarget && createPortal(
      <ChallengeSetupModal
        friend={challengeTarget}
        color={challengeColor}
        setColor={setChallengeColor}
        timeKey={challengeTimeKey}
        setTimeKey={setChallengeTimeKey}
        isSending={isSending}
        onSend={async () => {
          setIsSending(true);
          try {
            await onChallenge(challengeTarget, challengeColor, challengeTimeKey);
            setChallengeTarget(null);
          } catch (err: any) {
            console.error("Challenge failed:", err?.message ?? err);
            toast.error(err?.message ? `Error: ${err.message}` : "Failed to send challenge — check your DB migrations.");
            setIsSending(false);
          }
        }}
        onCancel={() => setChallengeTarget(null)}
      />,
      document.body,
    )}
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
    >
      {/* Tabs */}
      <div className="flex gap-1 p-2" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        <TabBtn id="friends" label="Friends" />
        <TabBtn id="search" label="Find" />
        <TabBtn id="requests" label="Requests" badge={receivedRequests.length} />
        <TabBtn id="challenges" label="Challenges" badge={pendingChallenges.length} />
      </div>

      <div className="p-4 min-h-[180px]">
        {/* Friends tab */}
        {tab === "friends" && (
          <div>
            {friends.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                No friends yet — search for players to add them
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {friends.map((f) => (
                  <UserRow
                    key={f.id}
                    user={f}
                    action={
                      <button
                        onClick={() => setChallengeTarget(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: "rgba(56,224,195,0.12)",
                          border: "0.5px solid rgba(56,224,195,0.25)",
                          color: "#38E0C3",
                        }}
                      >
                        Challenge
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search tab */}
        {tab === "search" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by username…"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.85)",
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                style={{
                  background: "rgba(56,224,195,0.12)",
                  border: "0.5px solid rgba(56,224,195,0.25)",
                  color: "#38E0C3",
                }}
              >
                {searching ? "…" : "Go"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {searchResults.map((u) => {
                  const isFriend = friends.some((f) => f.id === u.id);
                  const isPending = pendingOutgoing.includes(u.id);
                  return (
                    <UserRow
                      key={u.id}
                      user={u}
                      action={
                        isFriend ? (
                          <button
                            onClick={() => setChallengeTarget(u)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{
                              background: "rgba(56,224,195,0.12)",
                              border: "0.5px solid rgba(56,224,195,0.25)",
                              color: "#38E0C3",
                            }}
                          >
                            Challenge
                          </button>
                        ) : isPending ? (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(u.id)}
                            disabled={addingId === u.id}
                            className="px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-40"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "0.5px solid rgba(255,255,255,0.12)",
                              color: "rgba(255,255,255,0.6)",
                            }}
                          >
                            {addingId === u.id ? "…" : "+ Add"}
                          </button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          <div className="space-y-4">
            {/* Received */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                Received ({receivedRequests.length})
              </p>
              {receivedRequests.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "rgba(255,255,255,0.25)" }}>No incoming requests</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {receivedRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm select-none"
                          style={{ background: "rgba(56,224,195,0.12)", color: "#38E0C3", border: "0.5px solid rgba(56,224,195,0.2)" }}>
                          {(r.username ?? r.full_name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                            @{r.username ?? r.full_name ?? "Unknown"}
                          </p>
                          {r.full_name && r.username && (
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{r.full_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAcceptFriendRequest(r.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.25)", color: "#38E0C3" }}
                        >Accept</button>
                        <button
                          onClick={() => handleDeleteFriendship(r.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)" }}
                        >Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Sent */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                Sent ({sentRequests.length})
              </p>
              {sentRequests.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "rgba(255,255,255,0.25)" }}>No pending requests</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {sentRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm select-none"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
                          {(r.username ?? r.full_name ?? "?")[0].toUpperCase()}
                        </div>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                          @{r.username ?? r.full_name ?? "Unknown"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFriendship(r.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs"
                        style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                      >Cancel</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Challenges tab */}
        {tab === "challenges" && (
          <div>
            {pendingChallenges.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                No pending challenges
              </p>
            ) : (
              <div className="space-y-3">
                {pendingChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                      <span style={{ color: "#38E0C3" }}>@{c.challenger_username}</span> challenged you
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(56,224,195,0.12)",
                          border: "0.5px solid rgba(56,224,195,0.25)",
                          color: "#38E0C3",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "0.5px solid rgba(239,68,68,0.15)",
                          color: "rgba(239,68,68,0.7)",
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ─── Chess Landing Page ────────────────────────────────────────────────────────

function ChessLandingPage({ profile }: { profile: Profile | null }) {
  const navigate = useNavigate();
  return (
    <div className="relative px-5 sm:px-6 py-6 max-w-md mx-auto pb-28 md:pb-6">
      <button
        onClick={() => navigate("/break")}
        className="inline-flex items-center gap-1.5 text-xs mb-6 transition-all"
        style={{ color: "rgba(255,255,255,0.4)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
      >
        ← Break Room
      </button>

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
          Chess
        </h1>
        {profile && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.2)", color: "#38E0C3" }}
          >
            ♟ {profile.chess_elo ?? 1000} ELO
          </div>
        )}
      </div>
      <p className="text-sm mb-7" style={{ color: "rgba(255,255,255,0.35)" }}>
        Choose how you want to play
      </p>

      {/* Mode cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* vs AI */}
        <button
          onClick={() => navigate("/break/chess/ai")}
          className="flex flex-col gap-3 p-5 rounded-2xl text-left transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
        >
          <div className="flex items-center gap-2">
            {BOTS.slice(0, 3).map((b) => (
              <span key={b.id} className="text-xl leading-none" title={b.name}>{b.emoji}</span>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#fff", letterSpacing: "-0.01em" }}>vs AI</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              8 bots · any level
            </p>
          </div>
          <span className="text-[10px] font-medium" style={{ color: "#38E0C3" }}>New Game →</span>
        </button>

        {/* vs Friend */}
        <button
          onClick={() => navigate("/break/chess/friends")}
          className="flex flex-col gap-3 p-5 rounded-2xl text-left transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
        >
          <span className="text-3xl leading-none" style={{ lineHeight: 1.2 }}>👥</span>
          <div>
            <p className="text-sm font-medium" style={{ color: "#fff", letterSpacing: "-0.01em" }}>vs Friend</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Real-time · ELO rated
            </p>
          </div>
          <span className="text-[10px] font-medium" style={{ color: "#38E0C3" }}>Challenge →</span>
        </button>
      </div>

      {profile && <PastGames profileId={profile.id} />}
    </div>
  );
}

// ─── AI Setup Page ─────────────────────────────────────────────────────────────

function AISetupPage({
  setup,
  setSetup,
  onStart,
  profile,
}: {
  setup: GameSetup;
  setSetup: React.Dispatch<React.SetStateAction<GameSetup>>;
  onStart: () => void;
  profile: Profile | null;
}) {
  const navigate = useNavigate();

  function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
          {label}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className="relative px-5 sm:px-6 py-6 max-w-md mx-auto pb-28 md:pb-6">
      <button
        onClick={() => navigate("/break/chess")}
        className="inline-flex items-center gap-1.5 text-xs mb-6 transition-all"
        style={{ color: "rgba(255,255,255,0.4)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
      >
        ← Chess
      </button>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
          New Game vs AI
        </h1>
        {profile && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.2)", color: "#38E0C3" }}
          >
            ♟ {profile.chess_elo ?? 1000}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5 space-y-6" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}>
        <Section label="Play as">
          <div className="flex gap-2">
            {([
              { key: "white" as SetupColor, icon: "♔", label: "White" },
              { key: "black" as SetupColor, icon: "♚", label: "Black" },
              { key: "random" as SetupColor, icon: "🎲", label: "Random" },
            ]).map(({ key, icon, label }) => (
              <OptionBtn key={key} active={setup.color === key} onClick={() => setSetup((s) => ({ ...s, color: key }))}>
                <span className="block text-lg leading-none mb-1">{icon}</span>
                <span className="block text-xs">{label}</span>
              </OptionBtn>
            ))}
          </div>
        </Section>

        <Section label="Choose Opponent">
          <div className="grid grid-cols-2 gap-2">
            {BOTS.map((bot) => {
              const active = setup.botId === bot.id;
              return (
                <button
                  key={bot.id}
                  onClick={() => setSetup((s) => ({ ...s, difficulty: bot.difficulty, botId: bot.id, botName: bot.name }))}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: active ? "rgba(56,224,195,0.1)" : "rgba(255,255,255,0.04)",
                    border: `0.5px solid ${active ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg leading-none">{bot.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: active ? "#38E0C3" : "rgba(255,255,255,0.85)" }}>
                        {bot.name}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {bot.title}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono shrink-0" style={{ color: active ? "rgba(56,224,195,0.7)" : "rgba(255,255,255,0.25)" }}>
                      {bot.elo}
                    </span>
                  </div>
                  <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {bot.style}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section label="Time control">
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map(({ key, label, sub }) => (
              <OptionBtn key={key} active={setup.timeKey === key} onClick={() => setSetup((s) => ({ ...s, timeKey: key }))}>
                <span className="block font-medium text-base leading-none mb-0.5">{label}</span>
                <span className="block text-[10px] opacity-60">{sub}</span>
              </OptionBtn>
            ))}
          </div>
        </Section>
      </div>

      <button
        onClick={onStart}
        className="w-full mt-5 py-4 rounded-xl font-medium transition-all"
        style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.4)", color: "#38E0C3" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.22)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.15)"; }}
      >
        Start Game →
      </button>
    </div>
  );
}

// ─── Friends Challenge Page ────────────────────────────────────────────────────

function FriendsChallengePage({
  profile,
  onChallenge,
}: {
  profile: Profile | null;
  onChallenge: (friend: FriendEntry, color: SetupColor, timeKey: TimeKey) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="relative px-5 sm:px-6 py-6 max-w-md mx-auto pb-28 md:pb-6">
      <button
        onClick={() => navigate("/break/chess")}
        className="inline-flex items-center gap-1.5 text-xs mb-6 transition-all"
        style={{ color: "rgba(255,255,255,0.4)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
      >
        ← Chess
      </button>
      <h1 className="text-2xl font-medium mb-6" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
        Challenge a Friend
      </h1>
      <FriendSearchPanel onChallenge={onChallenge} profile={profile} />
    </div>
  );
}

// ─── Past Games ────────────────────────────────────────────────────────────────

function PastGames({ profileId }: { profileId: string }) {
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["past-chess-games", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chess_games")
        .select(
          "id, result, game_type, difficulty, moves_count, updated_at, game_over_reason, user_id, player2_id, winner_id, bot_id, player1:profiles!chess_games_user_id_fkey(username), player2:profiles!chess_games_player2_id_fkey(username)"
        )
        .or(`user_id.eq.${profileId},player2_id.eq.${profileId}`)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    enabled: !!profileId,
  });

  if (isLoading) return null;
  if (games.length === 0) return null;

  const REASON_SHORT: Record<string, string> = {
    checkmate: "Checkmate",
    stalemate: "Stalemate",
    resignation: "Resigned",
    timeout: "Time",
    insufficient: "Insuff.",
    repetition: "Repetition",
    fifty_moves: "50-move",
  };

  return (
    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
        Recent Games
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}>
        {games.map((g: any, i: number) => {
          const isAI = g.game_type !== "multiplayer";
          // Opponent name
          let opponentName: string;
          if (isAI) {
            const bot = g.bot_id ? BOTS.find((b) => b.id === g.bot_id) : null;
            opponentName = bot ? `${bot.emoji} ${bot.name}` : `AI (${(g.difficulty ?? "easy").charAt(0).toUpperCase() + (g.difficulty ?? "easy").slice(1)})`;
          } else {
            const oppProfile = g.user_id === profileId ? g.player2 : g.player1;
            opponentName = oppProfile?.username ? `@${oppProfile.username}` : "Unknown";
          }
          // My result
          let myResult: "win" | "loss" | "draw" | null = null;
          if (isAI) {
            myResult = g.result ?? null;
          } else if (g.winner_id) {
            myResult = g.winner_id === profileId ? "win" : "loss";
          } else if (g.result === "draw") {
            myResult = "draw";
          }
          const resultColor = myResult === "win" ? "#38E0C3" : myResult === "loss" ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.45)";
          const resultLabel = myResult === "win" ? "Win" : myResult === "loss" ? "Loss" : myResult === "draw" ? "Draw" : "—";
          const reasonLabel = g.game_over_reason ? REASON_SHORT[g.game_over_reason] ?? g.game_over_reason : "";
          const date = g.updated_at ? new Date(g.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

          return (
            <button
              key={g.id}
              onClick={() => navigate(`/break/chess/${g.id}`)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
              style={{
                borderBottom: i < games.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {opponentName}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {reasonLabel}{reasonLabel && date ? " · " : ""}{date}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {g.moves_count ?? 0}m
                </span>
                <span className="text-xs font-medium w-8 text-right" style={{ color: resultColor }}>
                  {resultLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared board wrapper (used by both AI + MP game views) ───────────────────

interface BoardViewProps {
  displayFen: string;
  orientation: "white" | "black";
  isInteractive: boolean;
  onDrop: (from: string, to: string) => Promise<boolean>;
  game: import("chess.js").Chess;
  whiteMs: number | null;
  blackMs: number | null;
  currentTurn: "w" | "b";
  isGameActive: boolean;
  playerLabel: string;
  opponentLabel: string;
  playerElo?: number;
  opponentElo?: number;
  playerAvatarUrl?: string | null;
  opponentAvatarUrl?: string | null;
  moveHistory: import("@/hooks/useChess").ChessMove[];
  currentMoveIndex: number;
  goToMove: (i: number) => void;
  gameRecord: any;
  onRequestReview?: () => void;
  isRequestingReview?: boolean;
  showReview?: boolean;
  waitingMessage?: string;
}

function BoardView({
  displayFen,
  orientation,
  isInteractive,
  onDrop,
  game,
  whiteMs,
  blackMs,
  currentTurn,
  isGameActive,
  playerLabel,
  opponentLabel,
  playerElo,
  opponentElo,
  playerAvatarUrl,
  opponentAvatarUrl,
  moveHistory,
  currentMoveIndex,
  goToMove,
  gameRecord,
  onRequestReview,
  isRequestingReview,
  showReview,
  waitingMessage,
}: BoardViewProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const playerMs = orientation === "white" ? whiteMs : blackMs;
  const opponentMs = orientation === "white" ? blackMs : whiteMs;
  const playerTurnChar: "w" | "b" = orientation === "white" ? "w" : "b";
  const isReviewing = currentMoveIndex !== -1;

  const clearSelection = () => {
    setSelectedSquare(null);
    setOptionSquares({});
  };

  const onSquareClick = (square: string) => {
    if (!isInteractive || isReviewing) return;

    // If a square is already selected and we click a legal move destination → move
    if (selectedSquare && optionSquares[square]) {
      onDrop(selectedSquare, square);
      clearSelection();
      return;
    }

    const piece = game.get(square as Square);
    // Select if it's our piece
    if (piece && piece.color === playerTurnChar) {
      const moves = game.moves({ square: square as Square, verbose: true }) as { to: string }[];
      if (!moves.length) { clearSelection(); return; }

      const squares: Record<string, React.CSSProperties> = {
        [square]: { background: "rgba(56,224,195,0.18)", borderRadius: "4px" },
      };
      moves.forEach((m) => {
        const hasCapture = !!game.get(m.to as Square);
        squares[m.to] = hasCapture
          ? {
              background:
                "radial-gradient(circle, rgba(56,224,195,0.45) 65%, transparent 65%)",
              borderRadius: "50%",
            }
          : {
              background:
                "radial-gradient(circle, rgba(56,224,195,0.55) 28%, transparent 28%)",
              borderRadius: "50%",
            };
      });
      setSelectedSquare(square);
      setOptionSquares(squares);
    } else {
      clearSelection();
    }
  };

  // Clear selection after any move
  useEffect(() => {
    clearSelection();
  }, [game.fen()]);

  return (
    <div className="max-w-[540px] mx-auto lg:mx-0 space-y-2">
      <ChessClock
        ms={opponentMs}
        label={opponentLabel}
        isActive={currentTurn !== playerTurnChar && isGameActive}
        elo={opponentElo}
        avatarUrl={opponentAvatarUrl}
      />

      {waitingMessage ? (
        <div
          className="aspect-square rounded-xl flex flex-col items-center justify-center gap-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: "#38E0C3" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {waitingMessage}
          </p>
        </div>
      ) : (
        <Chessboard
          position={displayFen}
          onPieceDrop={(sourceSquare, targetSquare) => {
            if (!isInteractive || isReviewing) return false;
            onDrop(sourceSquare, targetSquare);
            return true;
          }}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          animationDuration={200}
          customBoardStyle={{
            borderRadius: "12px",
            boxShadow: "0 0 0 0.5px rgba(56,224,195,0.15)",
          }}
          customDarkSquareStyle={{ backgroundColor: "#1a3a4a" }}
          customLightSquareStyle={{ backgroundColor: "#2d5a6e" }}
          customDropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgba(56,224,195,0.5)" }}
          customSquareStyles={optionSquares}
        />
      )}

      <ChessClock
        ms={playerMs}
        label={playerLabel}
        isActive={currentTurn === playerTurnChar && isGameActive}
        elo={playerElo}
        avatarUrl={playerAvatarUrl}
      />

      {/* Navigation arrows — only visible for finished games, directly under board */}
      {!isGameActive && moveHistory.length > 0 && (
        <div
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          {[
            {
              label: "◀◀",
              title: "First",
              onClick: () => goToMove(0),
              disabled: currentMoveIndex === 0,
            },
            {
              label: "◀",
              title: "Previous",
              onClick: () => goToMove(Math.max(0, currentMoveIndex === -1 ? moveHistory.length - 2 : currentMoveIndex - 1)),
              disabled: currentMoveIndex === 0,
            },
          ].map(({ label, title, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              title={title}
              disabled={disabled}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all disabled:opacity-25"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              {label}
            </button>
          ))}
          <span className="text-xs tabular-nums px-2" style={{ color: "rgba(255,255,255,0.35)", minWidth: "52px", textAlign: "center" }}>
            {currentMoveIndex === -1 ? moveHistory.length : currentMoveIndex + 1} / {moveHistory.length}
          </span>
          {[
            {
              label: "▶",
              title: "Next",
              onClick: () => goToMove(currentMoveIndex === -1 ? -1 : Math.min(moveHistory.length - 1, currentMoveIndex + 1)),
              disabled: currentMoveIndex === -1,
            },
            {
              label: "▶▶",
              title: "Last",
              onClick: () => goToMove(-1),
              disabled: currentMoveIndex === -1,
            },
          ].map(({ label, title, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              title={title}
              disabled={disabled}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all disabled:opacity-25"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Move history on mobile (below clocks) */}
      <div className="lg:hidden pt-1 space-y-2">
        <ChessMoveHistory moves={moveHistory} currentIndex={currentMoveIndex} onGoToMove={goToMove} />
        {showReview && (
          <ChessAIReview
            gameRecord={gameRecord}
            onRequestReview={onRequestReview!}
            isRequesting={isRequestingReview}
          />
        )}
      </div>
    </div>
  );
}

// ─── AI Game ───────────────────────────────────────────────────────────────────

function AIGame({ gameId, initialSetup }: { gameId?: string; initialSetup: GameSetup }) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [resultInfo, setResultInfo] = useState<GameOverInfo | null>(null);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timedOutRef = useRef(false);
  const sounds = useChessSound();

  const {
    game, displayFen, moveHistory, currentMoveIndex,
    orientation, gameRecord, isLoadingGame,
    gameStatus, onDrop, startNewGame, goToMove, resign, timeoutGame, reloadGame,
  } = useChess(gameId, {
    onGameOver: (info) => {
      setResultInfo(info);
      if (info.result === "win") sounds.playWin();
      else if (info.result === "loss") sounds.playLoss();
      else sounds.playDraw();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    onMove: (isCapture, isCheck) => {
      if (isCheck) sounds.playCheck();
      else if (isCapture) sounds.playCapture();
      else sounds.playMove();
    },
  });

  const currentTurn = game.turn() as "w" | "b";
  const isGameActive = gameRecord?.status === "active";

  const { showQuit, setShowQuit } = useBackGuard(isGameActive && !resultInfo);

  // Start game if no gameId
  useEffect(() => {
    if (!gameId) {
      handleStart();
    }
  }, []);

  async function handleStart() {
    const color: "white" | "black" =
      initialSetup.color === "random"
        ? Math.random() > 0.5 ? "white" : "black"
        : initialSetup.color;

    const tc = TIME_OPTIONS.find((t) => t.key === initialSetup.timeKey);
    const ms = tc?.minutes !== null && tc?.minutes !== undefined ? tc.minutes * 60_000 : null;
    setWhiteMs(ms);
    setBlackMs(ms);
    timedOutRef.current = false;

    const record = await startNewGame(color, initialSetup.difficulty, initialSetup.timeKey, initialSetup.botId);
    if (record) {
      navigate(`/break/chess/${record.id}`, { replace: true, state: { setup: { ...initialSetup, color } } });
    }
  }

  // Timer tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isGameActive || whiteMs === null || blackMs === null) return;
    timerRef.current = setInterval(() => {
      if (currentTurn === "w") setWhiteMs((p) => (p === null ? null : Math.max(0, p - 100)));
      else setBlackMs((p) => (p === null ? null : Math.max(0, p - 100)));
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, isGameActive, gameRecord?.id]);

  // Timeout
  useEffect(() => {
    if (whiteMs === 0 && isGameActive && !timedOutRef.current) {
      timedOutRef.current = true; timeoutGame("white");
    }
  }, [whiteMs]);
  useEffect(() => {
    if (blackMs === 0 && isGameActive && !timedOutRef.current) {
      timedOutRef.current = true; timeoutGame("black");
    }
  }, [blackMs]);

  // Timer low tick
  useEffect(() => {
    const active = currentTurn === "w" ? whiteMs : blackMs;
    if (active !== null && active > 0 && active <= 10000 && active % 1000 < 100) {
      sounds.playTimerLow();
    }
  }, [whiteMs, blackMs]);

  const handleRequestReview = async () => {
    if (!gameRecord || !profile) return;
    if (profile.study_tokens < 20) {
      toast.error("Not enough tokens (need 20)");
      return;
    }
    setIsRequestingReview(true);
    try {
      // Deduct tokens first
      const newBalance = await deductTokens(profile.id, 20, "Chess AI review");
      const { data: fresh } = await supabase.from("profiles").select("*").eq("id", profile.id).single();
      if (fresh) refreshProfile(fresh as Profile);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-groq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          jsonMode: true,
          maxTokens: 1000,
          messages: [{
            role: "user",
            content: `You are a chess coach. Analyse this chess game PGN and give feedback. Return ONLY valid JSON with these fields: overall (2-3 sentence assessment), opening (opening name + brief comment), key_moments (array of {move_number, comment}), mistakes (array of strings), suggestions (array of 3-4 tips), rating (Beginner/Intermediate/Advanced).\n\nPGN: ${gameRecord.pgn}`,
          }],
        }),
      });

      if (!res.ok) throw new Error("Review request failed");
      const body = await res.json();
      let reviewData: Record<string, unknown>;
      try {
        reviewData = typeof body.content === "string" ? JSON.parse(body.content) : body.content ?? body;
      } catch {
        throw new Error("Could not parse review response");
      }

      await supabase.from("chess_games").update({
        ai_review: reviewData,
        ai_reviewed_at: new Date().toISOString(),
      }).eq("id", gameRecord.id);

      toast.success(`AI review ready! (${newBalance} tokens remaining)`);
      reloadGame();
    } catch {
      toast.error("Couldn't get review — try again");
    } finally {
      setIsRequestingReview(false);
    }
  };

  if (isLoadingGame && gameId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#38E0C3" }} />
      </div>
    );
  }

  const botProfile = !gameId ? BOTS.find((b) => b.id === initialSetup.botId) : null;
  const diffLabel = gameRecord?.difficulty ?? initialSetup.difficulty;
  const opponentLabel = botProfile
    ? `${botProfile.emoji} ${botProfile.name}`
    : `AI (${diffLabel.charAt(0).toUpperCase() + diffLabel.slice(1)})`;
  const status = gameStatus();
  const isReviewing = currentMoveIndex !== -1;

  return (
    <>
      {showQuit && (
        <QuitGameModal
          onConfirm={() => { setShowQuit(false); navigate("/break/chess"); }}
          onCancel={() => setShowQuit(false)}
        />
      )}
      <div className="relative px-4 sm:px-6 py-4 max-w-6xl mx-auto pb-28 md:pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 mb-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-medium truncate" style={{ color: "var(--text-primary)" }}>Chess</h1>
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
              {isReviewing ? `Reviewing move ${currentMoveIndex + 1}` : status}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isGameActive && (
              <button onClick={resign}
                className="px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              >Resign</button>
            )}
            {!isGameActive && (
              <button onClick={() => navigate("/break/chess")}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.12)"; }}
              >New Game</button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <BoardView
              displayFen={displayFen}
              orientation={orientation}
              isInteractive={isGameActive && !isReviewing}
              onDrop={onDrop}
              game={game}
              whiteMs={whiteMs}
              blackMs={blackMs}
              currentTurn={currentTurn}
              isGameActive={isGameActive}
              playerLabel="You"
              opponentLabel={opponentLabel}
              playerElo={profile?.chess_elo}
              playerAvatarUrl={profile?.avatar_url}
              moveHistory={moveHistory}
              currentMoveIndex={currentMoveIndex}
              goToMove={goToMove}
              gameRecord={gameRecord}
              onRequestReview={handleRequestReview}
              isRequestingReview={isRequestingReview}
              showReview={true}
            />
          </div>

          {/* Right column — desktop only */}
          <div className="hidden lg:block lg:w-72 space-y-3">
            <ChessMoveHistory moves={moveHistory} currentIndex={currentMoveIndex} onGoToMove={goToMove} />
            <ChessAIReview gameRecord={gameRecord} onRequestReview={handleRequestReview} isRequesting={isRequestingReview} />
          </div>
        </div>
      </div>

      <ChessResultModal
        info={resultInfo}
        onNewGame={() => navigate("/break/chess")}
        onReview={() => setResultInfo(null)}
        onGoHome={() => navigate("/break/chess")}
        eloChange={resultInfo ? (resultInfo.result === "win" ? 8 : resultInfo.result === "loss" ? -8 : 0) : undefined}
      />
    </>
  );
}

// ─── Multiplayer Game ──────────────────────────────────────────────────────────

function MultiplayerGame({ gameId }: { gameId: string }) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [resultInfo, setResultInfo] = useState<GameOverInfo | null>(null);
  const [wasDeclined, setWasDeclined] = useState(false);
  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timedOutRef = useRef(false);
  const sounds = useChessSound();
  const [opponentProfile, setOpponentProfile] = useState<{ username: string | null; chess_elo: number; avatar_url: string | null } | null>(null);
  // Tracks live timer values without causing effect re-runs
  const timerStateRef = useRef<{ white: number | null; black: number | null }>({ white: null, black: null });
  // Network disconnect state: seconds remaining before auto-resign (null = connected)
  const [disconnectedSecs, setDisconnectedSecs] = useState<number | null>(null);

  const {
    game, displayFen, moveHistory, currentMoveIndex,
    orientation, gameRecord, isLoadingGame,
    myColor, gameStatus, onDrop, goToMove, resign, timeoutGame,
  } = useMultiplayerChess(gameId, {
    onGameOver: (info) => {
      setResultInfo(info);
      if (info.result === "win") sounds.playWin();
      else if (info.result === "loss") sounds.playLoss();
      else sounds.playDraw();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    onMove: (isCapture, isCheck) => {
      if (isCheck) sounds.playCheck();
      else if (isCapture) sounds.playCapture();
      else sounds.playMove();
    },
    onDeclined: () => {
      setWasDeclined(true);
      toast("Opponent declined your challenge", {
        icon: "❌",
        style: { background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(239,68,68,0.2)", color: "rgba(255,255,255,0.75)" },
      });
      setTimeout(() => navigate("/break/chess"), 3000);
    },
  });

  const currentTurn = game.turn() as "w" | "b";
  const isGameActive = gameRecord?.status === "active";
  const isWaiting = (gameRecord?.status as string) === "waiting";

  const { showQuit: showQuitMp, setShowQuit: setShowQuitMp } = useBackGuard(isGameActive && !resultInfo);

  // Fetch opponent profile once we know the game record
  useEffect(() => {
    if (!gameRecord || !profile) return;
    const opponentId = gameRecord.user_id === profile.id ? gameRecord.player2_id : gameRecord.user_id;
    if (!opponentId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, chess_elo, avatar_url")
        .eq("id", opponentId)
        .maybeSingle();
      if (data) setOpponentProfile({ username: data.username, chess_elo: data.chess_elo ?? 1000, avatar_url: data.avatar_url ?? null });
    })();
  }, [gameRecord?.id, profile?.id]);

  // Init timers — restore from DB values with elapsed-time compensation, or set fresh
  useEffect(() => {
    if (!gameRecord || gameRecord.status !== "active") return;
    const tc = TIME_OPTIONS.find((t) => t.key === gameRecord.time_control);
    const baseMs = tc?.minutes !== null && tc?.minutes !== undefined ? tc.minutes * 60_000 : null;

    if (baseMs === null) {
      setWhiteMs(null);
      setBlackMs(null);
      timerStateRef.current = { white: null, black: null };
      return;
    }

    const stored = (gameRecord as any);
    if (stored.white_time_ms !== null && stored.white_time_ms !== undefined &&
        stored.black_time_ms !== null && stored.black_time_ms !== undefined) {
      // Compensate for time elapsed since the last DB write
      const elapsed = Date.now() - new Date(gameRecord.updated_at).getTime();
      const turnChar = gameRecord.fen?.split(" ")?.[1] ?? "w";
      const wMs = Math.max(0, turnChar === "w" ? stored.white_time_ms - elapsed : stored.white_time_ms);
      const bMs = Math.max(0, turnChar === "b" ? stored.black_time_ms - elapsed : stored.black_time_ms);
      setWhiteMs(wMs);
      setBlackMs(bMs);
      timerStateRef.current = { white: wMs, black: bMs };
    } else {
      setWhiteMs(baseMs);
      setBlackMs(baseMs);
      timerStateRef.current = { white: baseMs, black: baseMs };
    }
  }, [gameRecord?.id]); // Only on game ID change — avoids reset on every Realtime update

  // Keep timerStateRef in sync with state (without triggering effect re-runs)
  useEffect(() => {
    timerStateRef.current = { white: whiteMs, black: blackMs };
  }, [whiteMs, blackMs]);

  // Persist timer to DB every 3 seconds so reloads can restore them
  useEffect(() => {
    if (!isGameActive) return;
    const syncInterval = setInterval(async () => {
      const { white, black } = timerStateRef.current;
      if (white !== null || black !== null) {
        await supabase.from("chess_games").update({
          white_time_ms: white,
          black_time_ms: black,
        }).eq("id", gameId);
      }
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [isGameActive, gameId]);

  // Timer tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isGameActive || whiteMs === null || blackMs === null) return;
    timerRef.current = setInterval(() => {
      if (currentTurn === "w") setWhiteMs((p) => (p === null ? null : Math.max(0, p - 100)));
      else setBlackMs((p) => (p === null ? null : Math.max(0, p - 100)));
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, isGameActive]);

  useEffect(() => {
    if (whiteMs === 0 && isGameActive && !timedOutRef.current) {
      timedOutRef.current = true; timeoutGame("white");
    }
  }, [whiteMs]);
  useEffect(() => {
    if (blackMs === 0 && isGameActive && !timedOutRef.current) {
      timedOutRef.current = true; timeoutGame("black");
    }
  }, [blackMs]);

  // Network disconnect → countdown → auto-resign (mirrors chess.com behaviour)
  useEffect(() => {
    if (!isGameActive) return;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    const handleOffline = () => {
      let secs = 60;
      setDisconnectedSecs(secs);
      countdownInterval = setInterval(() => {
        secs -= 1;
        if (secs <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          setDisconnectedSecs(null);
          resign();
        } else {
          setDisconnectedSecs(secs);
        }
      }, 1000);
    };

    const handleOnline = () => {
      if (countdownInterval) clearInterval(countdownInterval);
      setDisconnectedSecs(null);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isGameActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (wasDeclined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center px-6">
        <p className="text-5xl select-none">❌</p>
        <p className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "-0.025em" }}>
          Opponent declined your challenge
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Redirecting to setup…
        </p>
      </div>
    );
  }

  if (isLoadingGame) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#38E0C3" }} />
      </div>
    );
  }

  if (isWaiting) {
    const timeLabel = gameRecord?.time_control === "unlimited" ? "∞ No timer"
      : `${gameRecord?.time_control} min`;
    const colorLabel = orientation === "white" ? "White ♔" : "Black ♚";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6 py-10">
        {/* Pulsing ring */}
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(56,224,195,0.15)", borderTopColor: "#38E0C3" }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-2xl select-none">♟</span>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-1" style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "-0.025em" }}>
            Waiting for opponent…
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Challenge sent. Your opponent will see a notification.
          </p>
        </div>

        {/* Game info pill */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
          style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.18)" }}
        >
          <span style={{ color: "#38E0C3" }}>You play {colorLabel}</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>{timeLabel}</span>
        </div>

        <button
          onClick={async () => {
            await supabase.from("chess_games").update({ status: "declined" }).eq("id", gameId);
            navigate("/break/chess");
          }}
          className="mt-2 px-5 py-2 rounded-xl text-xs transition-all"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "0.5px solid rgba(239,68,68,0.15)",
            color: "rgba(239,68,68,0.65)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; }}
        >
          Cancel Challenge
        </button>
      </div>
    );
  }

  const status = gameStatus();
  const isReviewing = currentMoveIndex !== -1;
  const opponentLabel = opponentProfile?.username ? `@${opponentProfile.username}` : "Opponent";

  return (
    <>
      {showQuitMp && (
        <QuitGameModal
          message="Quitting will end your multiplayer game. Your opponent will win by forfeit."
          onConfirm={() => { setShowQuitMp(false); navigate("/break/chess"); }}
          onCancel={() => setShowQuitMp(false)}
        />
      )}
      <div className="relative px-4 sm:px-6 py-4 max-w-6xl mx-auto pb-28 md:pb-6">
        {/* Network disconnect banner */}
        {disconnectedSecs !== null && (
          <div
            className="mb-3 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3"
            style={{ background: "rgba(239,68,68,0.12)", border: "0.5px solid rgba(239,68,68,0.3)" }}
          >
            <p className="text-xs" style={{ color: "rgba(239,68,68,0.9)" }}>
              Connection lost — auto-resign in {disconnectedSecs}s
            </p>
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-medium"
              style={{ background: "rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.9)" }}
            >
              {disconnectedSecs}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 mb-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-medium truncate" style={{ color: "var(--text-primary)" }}>Chess</h1>
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
              {isReviewing ? `Reviewing move ${currentMoveIndex + 1}` : status}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isGameActive && (
              <button onClick={resign}
                className="px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              >Resign</button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <BoardView
              displayFen={displayFen}
              orientation={orientation}
              isInteractive={isGameActive && !isReviewing && game.turn() === (myColor === "white" ? "w" : "b")}
              onDrop={onDrop}
              game={game}
              whiteMs={whiteMs}
              blackMs={blackMs}
              currentTurn={currentTurn}
              isGameActive={isGameActive}
              playerLabel="You"
              opponentLabel={opponentLabel}
              playerElo={profile?.chess_elo ?? undefined}
              opponentElo={opponentProfile?.chess_elo}
              playerAvatarUrl={profile?.avatar_url}
              opponentAvatarUrl={opponentProfile?.avatar_url}
              moveHistory={moveHistory}
              currentMoveIndex={currentMoveIndex}
              goToMove={goToMove}
              gameRecord={gameRecord}
              showReview={false}
              waitingMessage={isWaiting ? "Waiting for opponent to join…" : (isGameActive && myColor === "black" && game.history().length === 0) ? "White plays first — waiting for their move…" : undefined}
            />
          </div>

          <div className="hidden lg:block lg:w-72 space-y-3">
            <ChessMoveHistory moves={moveHistory} currentIndex={currentMoveIndex} onGoToMove={goToMove} />
          </div>
        </div>
      </div>

      <ChessResultModal
        info={resultInfo}
        onNewGame={() => navigate("/break/chess")}
        onReview={() => setResultInfo(null)}
        onGoHome={() => navigate("/break/chess")}
        eloChange={resultInfo ? (resultInfo.result === "win" ? 8 : resultInfo.result === "loss" ? -8 : 0) : undefined}
      />
    </>
  );
}

// ─── Root page — routes to setup, AI game, or MP game ────────────────────────

const DEFAULT_SETUP: GameSetup = { mode: "ai", color: "white", difficulty: "easy", botId: "studybot", botName: "StudyBot", timeKey: "unlimited" };

export default function ChessPage() {
  const { id: gameId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);

  const [setup, setSetup] = useState<GameSetup>(DEFAULT_SETUP);
  const [gameType, setGameType] = useState<"ai" | "multiplayer" | "loading" | null>(null);

  // Setup passed via navigate state (from setup screen → /new)
  const navSetup: GameSetup | undefined = (location.state as any)?.setup;

  // Detect game type for known IDs
  useEffect(() => {
    if (!gameId || gameId === "new") { setGameType(null); return; }
    setGameType("loading");
    supabase
      .from("chess_games")
      .select("game_type")
      .eq("id", gameId)
      .single()
      .then(({ data }) => setGameType((data?.game_type as "ai" | "multiplayer") ?? "ai"));
  }, [gameId]);

  const handleChallengeFriend = async (friend: FriendEntry, color: SetupColor, timeKey: TimeKey) => {
    if (!profile) throw new Error("Not logged in");
    const playerColor: "white" | "black" =
      color === "random" ? (Math.random() > 0.5 ? "white" : "black") : color;

    const { data, error } = await supabase
      .from("chess_games")
      .insert({
        user_id: profile.id,
        player2_id: friend.id,
        game_type: "multiplayer",
        status: "waiting",
        player1_color: playerColor,
        pgn: "",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        time_control: timeKey,
        difficulty: "easy",
        moves_count: 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No data returned");

    // Navigate challenger to waiting board immediately
    navigate(`/break/chess/mp/${data.id}`);
  };

  const backBtn = (
    <button
      onClick={() => navigate("/break/chess")}
      className="inline-flex items-center gap-1.5 text-xs transition-all"
      style={{ color: "rgba(255,255,255,0.4)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
    >
      ← Chess
    </button>
  );

  // Landing page (no gameId)
  if (!gameId) {
    return <ChessLandingPage profile={profile} />;
  }

  // AI setup page
  if (gameId === "ai") {
    return (
      <AISetupPage
        setup={setup}
        setSetup={setSetup}
        onStart={() => navigate("/break/chess/new", { state: { setup } })}
        profile={profile}
      />
    );
  }

  // Friends challenge page
  if (gameId === "friends") {
    return <FriendsChallengePage profile={profile} onChallenge={handleChallengeFriend} />;
  }

  // /break/chess/new — start a fresh AI game
  if (gameId === "new") {
    return (
      <div>
        <div className="px-5 sm:px-6 pt-6 pb-2 max-w-6xl mx-auto">{backBtn}</div>
        <AIGame initialSetup={navSetup ?? setup} />
      </div>
    );
  }

  // Loading game type from DB
  if (gameType === "loading" || gameType === null) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#38E0C3" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 sm:px-6 pt-6 pb-2 max-w-6xl mx-auto">{backBtn}</div>
      {gameType === "multiplayer" ? (
        <MultiplayerGame gameId={gameId} />
      ) : (
        <AIGame gameId={gameId} initialSetup={navSetup ?? setup} />
      )}
    </div>
  );
}
