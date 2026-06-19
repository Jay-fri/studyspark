import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { UsernameModal } from "@/components/games/UsernameModal";
import toast from "react-hot-toast";

// ─── Motion variants ───────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 30 } },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type SetupColor = "white" | "black" | "random";
type TimeKey = "unlimited" | "1+0" | "3+0" | "5+0" | "10+0" | "15+0";

const TIME_OPTIONS: { key: TimeKey; label: string }[] = [
  { key: "unlimited", label: "∞" },
  { key: "1+0", label: "1 min" },
  { key: "3+0", label: "3 min" },
  { key: "5+0", label: "5 min" },
  { key: "10+0", label: "10 min" },
  { key: "15+0", label: "15 min" },
];

interface FriendEntry {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  chess_elo: number;
}

// ─── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: "0.5px solid rgba(255,255,255,0.12)" }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 select-none font-medium"
      style={{
        width: size, height: size,
        background: "rgba(56,224,195,0.12)",
        border: "0.5px solid rgba(56,224,195,0.2)",
        color: "#38E0C3",
        fontSize: size * 0.38,
      }}
    >
      {(name[0] ?? "?").toUpperCase()}
    </div>
  );
}

// ─── Scrabble challenge inline setup ───────────────────────────────────────────

function ScrabbleChallengeInline({
  friend,
  profileId,
  myUsername,
  onSent,
  onCancel,
}: {
  friend: FriendEntry;
  profileId: string;
  myUsername: string | null;
  onSent: (gameId: string) => void;
  onCancel: () => void;
}) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("scrabble_mp_games")
        .insert({
          host_id: profileId,
          player_ids: [profileId, friend.id],
          player_usernames: [myUsername ?? "Player 1", friend.username ?? "Player 2"],
          status: "lobby",
          board: [],
          racks: {},
          tile_bag: [],
          scores: {},
          move_history: [],
          current_player_idx: 0,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No data");
      toast.success(`Scrabble invite sent to @${friend.username ?? "friend"}!`);
      onSent(data.id);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="mt-2 p-3 rounded-xl space-y-3"
      style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.18)" }}
    >
      <div>
        <p className="text-[10px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
          Invite to Scrabble
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
          @{friend.username ?? friend.full_name} will join your lobby
        </p>
      </div>
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-xs transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
        >
          {sending ? "Sending…" : "Send 🔠"}
        </button>
      </div>
    </div>
  );
}

// ─── Chess challenge inline setup ──────────────────────────────────────────────

function ChessChallengeInline({
  friend,
  profileId,
  onSent,
  onCancel,
}: {
  friend: FriendEntry;
  profileId: string;
  onSent: (gameId: string) => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState<SetupColor>("random");
  const [timeKey, setTimeKey] = useState<TimeKey>("unlimited");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const playerColor: "white" | "black" =
        color === "random" ? (Math.random() > 0.5 ? "white" : "black") : color;
      const { data, error } = await supabase
        .from("chess_games")
        .insert({
          user_id: profileId,
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
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No data");
      toast.success(`Chess challenge sent to @${friend.username ?? "friend"}!`);
      onSent(data.id);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't send challenge");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="mt-2 p-3 rounded-xl space-y-3"
      style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.18)" }}
    >
      {/* Color */}
      <div>
        <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>You play as</p>
        <div className="flex gap-1.5">
          {([
            { key: "white" as SetupColor, icon: "♔" },
            { key: "black" as SetupColor, icon: "♚" },
            { key: "random" as SetupColor, icon: "🎲" },
          ]).map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setColor(key)}
              className="flex-1 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: color === key ? "rgba(56,224,195,0.15)" : "rgba(255,255,255,0.04)",
                border: `0.5px solid ${color === key ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: color === key ? "#38E0C3" : "rgba(255,255,255,0.5)",
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>Time control</p>
        <div className="flex gap-1 flex-wrap">
          {TIME_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeKey(key)}
              className="px-2 py-1 rounded-lg text-[10px] transition-all"
              style={{
                background: timeKey === key ? "rgba(56,224,195,0.15)" : "rgba(255,255,255,0.04)",
                border: `0.5px solid ${timeKey === key ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: timeKey === key ? "#38E0C3" : "rgba(255,255,255,0.4)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-xs transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
        >
          {sending ? "Sending…" : "Send ♟"}
        </button>
      </div>
    </div>
  );
}

// ─── Friends Drawer ────────────────────────────────────────────────────────────

type DrawerTab = "friends" | "find" | "requests" | "challenges";

function FriendsDrawer({
  onClose,
  profileId,
  myUsername,
}: {
  onClose: () => void;
  profileId: string;
  myUsername: string | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<DrawerTab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  // Chess challenge setup open for a specific friend
  const [chessChallengeFor, setChessChallengeFor] = useState<FriendEntry | null>(null);
  // Scrabble challenge setup open for a specific friend
  const [scrabbleChallengeFor, setScrabbleChallengeFor] = useState<FriendEntry | null>(null);
  // TTT invite in flight
  const [tttInvitingId, setTttInvitingId] = useState<string | null>(null);
  // Draughts invite in flight
  const [draughtsInvitingId, setDraughtsInvitingId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: friends = [], refetch: refetchFriends } = useQuery<FriendEntry[]>({
    queryKey: ["friends-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friends", { p_user_id: profileId });
      return (data ?? []).map((f: any) => ({
        id: f.friend_id,
        username: f.username,
        full_name: f.full_name,
        avatar_url: f.avatar_url,
        chess_elo: f.chess_elo ?? 1000,
      }));
    },
    enabled: !!profileId,
  });

  const { data: receivedRequests = [], refetch: refetchReceived } = useQuery<
    { id: string; requester_id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]
  >({
    queryKey: ["friend-requests-received-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, requester_id, profiles!friendships_requester_id_fkey(username, full_name, avatar_url)")
        .eq("addressee_id", profileId)
        .eq("status", "pending");
      return (data ?? []).map((f: any) => ({
        id: f.id,
        requester_id: f.requester_id,
        username: f.profiles?.username ?? null,
        full_name: f.profiles?.full_name ?? null,
        avatar_url: f.profiles?.avatar_url ?? null,
      }));
    },
    enabled: !!profileId,
    refetchInterval: 15000,
  });

  const { data: sentRequests = [], refetch: refetchSent } = useQuery<
    { id: string; addressee_id: string; username: string | null; full_name: string | null }[]
  >({
    queryKey: ["friend-requests-sent-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, addressee_id, profiles!friendships_addressee_id_fkey(username, full_name)")
        .eq("requester_id", profileId)
        .eq("status", "pending");
      return (data ?? []).map((f: any) => ({
        id: f.id,
        addressee_id: f.addressee_id,
        username: f.profiles?.username ?? null,
        full_name: f.profiles?.full_name ?? null,
      }));
    },
    enabled: !!profileId,
    refetchInterval: 15000,
  });

  const { data: chessChallenges = [], refetch: refetchChess } = useQuery<
    { id: string; user_id: string; player1_color: string; time_control: string; username: string | null; avatar_url: string | null }[]
  >({
    queryKey: ["chess-challenges-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chess_games")
        .select("id, user_id, player1_color, time_control, profiles!chess_games_user_id_fkey(username, avatar_url)")
        .eq("player2_id", profileId)
        .eq("status", "waiting")
        .eq("game_type", "multiplayer");
      return (data ?? []).map((g: any) => ({
        id: g.id,
        user_id: g.user_id,
        player1_color: g.player1_color,
        time_control: g.time_control,
        username: g.profiles?.username ?? null,
        avatar_url: g.profiles?.avatar_url ?? null,
      }));
    },
    enabled: !!profileId,
    refetchInterval: 10000,
  });

  const { data: tttChallenges = [], refetch: refetchTtt } = useQuery<
    { id: string; player_x_id: string; username: string | null; avatar_url: string | null }[]
  >({
    queryKey: ["ttt-challenges-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ttt_games")
        .select("id, player_x_id, profiles!ttt_games_player_x_id_fkey(username, avatar_url)")
        .eq("player_o_id", profileId)
        .eq("status", "waiting");
      return (data ?? []).map((g: any) => ({
        id: g.id,
        player_x_id: g.player_x_id,
        username: g.profiles?.username ?? null,
        avatar_url: g.profiles?.avatar_url ?? null,
      }));
    },
    enabled: !!profileId,
    refetchInterval: 10000,
  });

  const { data: draughtsChallenges = [], refetch: refetchDraughts } = useQuery<
    { id: string; player1_id: string; p1_username: string | null }[]
  >({
    queryKey: ["draughts-challenges-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("draughts_games")
        .select("id, player1_id, p1_username")
        .eq("player2_id", profileId)
        .eq("status", "waiting");
      return data ?? [];
    },
    enabled: !!profileId,
    refetchInterval: 10000,
  });

  const { data: scrabbleChallenges = [], refetch: refetchScrabble } = useQuery<
    { id: string; host_id: string; host_username: string | null }[]
  >({
    queryKey: ["scrabble-challenges-drawer", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("scrabble_mp_games")
        .select("id, host_id, player_usernames")
        .contains("player_ids", [profileId])
        .eq("status", "lobby")
        .neq("host_id", profileId);
      return (data ?? []).map((g: any) => ({
        id: g.id,
        host_id: g.host_id,
        host_username: (g.player_usernames as string[])?.[0] ?? null,
      }));
    },
    enabled: !!profileId,
    refetchInterval: 10000,
  });

  // ── Realtime — refetch challenges when new ones arrive ───────────────────────

  useEffect(() => {
    if (!profileId) return;
    const ch = supabase
      .channel(`challenges-realtime-${profileId}`)
      // Chess challenges sent to me
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "chess_games",
        filter: `player2_id=eq.${profileId}`,
      }, () => { refetchChess(); qc.invalidateQueries({ queryKey: ["friends-badge"] }); })
      // TTT challenges sent to me
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "ttt_games",
        filter: `player_o_id=eq.${profileId}`,
      }, () => { refetchTtt(); qc.invalidateQueries({ queryKey: ["friends-badge"] }); })
      // Draughts challenges sent to me
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "draughts_games",
        filter: `player2_id=eq.${profileId}`,
      }, () => { refetchDraughts(); qc.invalidateQueries({ queryKey: ["friends-badge"] }); })
      // Scrabble invites (no array filter support — client-side filter)
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "scrabble_mp_games",
      }, (payload: any) => {
        const row = payload.new as { player_ids: string[]; host_id: string };
        if (row.player_ids?.includes(profileId) && row.host_id !== profileId) {
          refetchScrabble();
          qc.invalidateQueries({ queryKey: ["friends-badge"] });
        }
      })
      // Friend requests sent to me
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "friendships",
        filter: `addressee_id=eq.${profileId}`,
      }, () => { refetchReceived(); qc.invalidateQueries({ queryKey: ["friends-badge"] }); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase.rpc("search_users_by_username", {
        p_query: searchQuery.trim(),
        p_user_id: profileId,
        p_limit: 10,
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
    setAddingId(userId);
    try {
      await supabase.from("friendships").insert({ requester_id: profileId, addressee_id: userId });
      toast.success("Friend request sent!");
      qc.invalidateQueries({ queryKey: ["friend-requests-sent-drawer", profileId] });
    } catch {
      toast.error("Couldn't send request");
    } finally {
      setAddingId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    refetchReceived();
    refetchFriends();
    qc.invalidateQueries({ queryKey: ["friends", profileId] });
  };

  const handleDeleteFriendship = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    refetchReceived();
    refetchSent();
  };

  const handleAcceptChess = async (gameId: string) => {
    await supabase.from("chess_games").update({ status: "active" }).eq("id", gameId);
    refetchChess();
    navigate(`/break/chess/mp/${gameId}`);
    onClose();
  };

  const handleDeclineChess = async (gameId: string) => {
    await supabase.from("chess_games").update({ status: "declined" }).eq("id", gameId);
    refetchChess();
  };

  const handleAcceptTtt = async (gameId: string) => {
    await supabase.from("ttt_games").update({ status: "active" }).eq("id", gameId);
    refetchTtt();
    navigate(`/break/ttt/${gameId}`);
    onClose();
  };

  const handleDeclineTtt = async (gameId: string) => {
    await supabase.from("ttt_games").update({ status: "declined" }).eq("id", gameId);
    refetchTtt();
  };

  const handleAcceptDraughts = async (gameId: string) => {
    // Initialize board on accept (it's empty when created from the Friends drawer)
    await supabase.from("draughts_games").update({ status: "active" }).eq("id", gameId);
    refetchDraughts();
    navigate(`/break/draughts/${gameId}`);
    onClose();
  };

  const handleDeclineDraughts = async (gameId: string) => {
    await supabase.from("draughts_games").update({ status: "declined" }).eq("id", gameId);
    refetchDraughts();
  };

  const handleAcceptScrabble = (gameId: string) => {
    refetchScrabble();
    navigate(`/break/scrabble/mp/${gameId}`);
    onClose();
  };

  const handleDeclineScrabble = async (gameId: string) => {
    // Remove the user from player_ids of the lobby game
    const { data } = await supabase.from("scrabble_mp_games").select("player_ids, player_usernames").eq("id", gameId).single();
    if (data) {
      const idx = (data.player_ids as string[]).indexOf(profileId);
      if (idx !== -1) {
        const newIds = [...(data.player_ids as string[])];
        const newNames = [...(data.player_usernames as string[])];
        newIds.splice(idx, 1);
        newNames.splice(idx, 1);
        await supabase.from("scrabble_mp_games").update({ player_ids: newIds, player_usernames: newNames }).eq("id", gameId);
      }
    }
    refetchScrabble();
  };

  const handleTttInvite = async (friend: FriendEntry) => {
    setTttInvitingId(friend.id);
    try {
      const { data, error } = await supabase
        .from("ttt_games")
        .insert({ player_x_id: profileId, player_o_id: friend.id, status: "waiting" })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed");
      toast.success(`Tic-tac-toe invite sent to @${friend.username ?? "friend"}!`);
      navigate(`/break/ttt/${data.id}`);
      onClose();
    } catch {
      toast.error("Couldn't send invite");
    } finally {
      setTttInvitingId(null);
    }
  };

  const handleDraughtsInvite = async (friend: FriendEntry) => {
    setDraughtsInvitingId(friend.id);
    try {
      const profileData = await supabase.from("profiles").select("username").eq("id", profileId).single();
      const myUsername = profileData.data?.username ?? null;
      const { data, error } = await supabase
        .from("draughts_games")
        .insert({
          player1_id: profileId,
          player2_id: friend.id,
          board: [],
          current_player: "player1",
          status: "waiting",
          p1_username: myUsername,
          p2_username: friend.username ?? null,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed");
      toast.success(`Draughts challenge sent to @${friend.username ?? "friend"}!`);
      navigate(`/break/draughts/${data.id}`);
      onClose();
    } catch {
      toast.error("Couldn't send challenge");
    } finally {
      setDraughtsInvitingId(null);
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────────

  const pendingCount = receivedRequests.length + chessChallenges.length + tttChallenges.length + draughtsChallenges.length + scrabbleChallenges.length;
  const requestCount = receivedRequests.length;
  const challengeCount = chessChallenges.length + tttChallenges.length + draughtsChallenges.length + scrabbleChallenges.length;

  // ── Tab button ────────────────────────────────────────────────────────────────

  function TabBtn({ id, label, badge }: { id: DrawerTab; label: string; badge?: number }) {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className="flex-1 py-2 text-xs font-medium rounded-lg transition-all relative"
        style={{
          background: active ? "rgba(56,224,195,0.1)" : "transparent",
          border: `0.5px solid ${active ? "rgba(56,224,195,0.25)" : "transparent"}`,
          color: active ? "#38E0C3" : "rgba(255,255,255,0.4)",
        }}
      >
        {label}
        {!!badge && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full text-[8px] font-medium flex items-center justify-center px-1"
            style={{ background: "#38E0C3", color: "#0a1628" }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  // ── Filtered friends for search in Friends tab ────────────────────────────────

  const [friendFilter, setFriendFilter] = useState("");
  const filteredFriends = friends.filter(
    (f) =>
      !friendFilter.trim() ||
      (f.username ?? "").toLowerCase().includes(friendFilter.toLowerCase()) ||
      (f.full_name ?? "").toLowerCase().includes(friendFilter.toLowerCase()),
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(10,22,40,0.65)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute top-0 right-0 bottom-0 w-full max-w-sm flex flex-col"
        style={{
          background: "rgba(12,20,36,0.98)",
          borderLeft: "0.5px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <h2
              className="text-base font-medium"
              style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.02em" }}
            >
              Friends
            </h2>
            {pendingCount > 0 && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
              >
                {pendingCount} pending
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 py-3 shrink-0"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          <TabBtn id="friends" label="Friends" />
          <TabBtn id="find" label="Find" />
          <TabBtn id="requests" label="Requests" badge={requestCount || undefined} />
          <TabBtn id="challenges" label="Challenges" badge={challengeCount || undefined} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">

          {/* ── Friends tab ──────────────────────────────────────────── */}
          {tab === "friends" && (
            <>
              <input
                value={friendFilter}
                onChange={(e) => setFriendFilter(e.target.value)}
                placeholder="Filter friends…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-3 transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "#fff" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />

              {filteredFriends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {friends.length === 0 ? "No friends yet — use Find to add some" : "No matches"}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div key={friend.id} className="space-y-0">
                    <div
                      className="flex items-center gap-3 px-3 py-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
                    >
                      <Avatar name={friend.username ?? friend.full_name ?? "?"} src={friend.avatar_url} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                          @{friend.username ?? "—"}
                        </p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                          ♟ {friend.chess_elo} ELO
                        </p>
                      </div>
                      {/* Challenge buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => setChessChallengeFor(chessChallengeFor?.id === friend.id ? null : friend)}
                          className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                          style={{
                            background: chessChallengeFor?.id === friend.id ? "rgba(56,224,195,0.15)" : "rgba(255,255,255,0.05)",
                            border: `0.5px solid ${chessChallengeFor?.id === friend.id ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.1)"}`,
                            color: chessChallengeFor?.id === friend.id ? "#38E0C3" : "rgba(255,255,255,0.5)",
                          }}
                          title="Chess challenge"
                        >
                          ♟
                        </button>
                        <button
                          onClick={() => handleTttInvite(friend)}
                          disabled={tttInvitingId === friend.id}
                          className="px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "0.5px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                          title="Tic-tac-toe invite"
                        >
                          {tttInvitingId === friend.id ? "…" : "✕○"}
                        </button>
                        <button
                          onClick={() => handleDraughtsInvite(friend)}
                          disabled={draughtsInvitingId === friend.id}
                          className="px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "0.5px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                          title="Draughts challenge"
                        >
                          {draughtsInvitingId === friend.id ? "…" : "⬛"}
                        </button>
                        <button
                          onClick={() => {
                            setScrabbleChallengeFor(scrabbleChallengeFor?.id === friend.id ? null : friend);
                            setChessChallengeFor(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs transition-all"
                          style={{
                            background: scrabbleChallengeFor?.id === friend.id ? "rgba(56,224,195,0.15)" : "rgba(255,255,255,0.05)",
                            border: `0.5px solid ${scrabbleChallengeFor?.id === friend.id ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.1)"}`,
                            color: scrabbleChallengeFor?.id === friend.id ? "#38E0C3" : "rgba(255,255,255,0.5)",
                          }}
                          title="Scrabble invite"
                        >
                          🔠
                        </button>
                      </div>
                    </div>

                    {/* Chess challenge inline setup */}
                    {chessChallengeFor?.id === friend.id && (
                      <ChessChallengeInline
                        friend={friend}
                        profileId={profileId}
                        onSent={(gameId) => {
                          setChessChallengeFor(null);
                          navigate(`/break/chess/mp/${gameId}`);
                          onClose();
                        }}
                        onCancel={() => setChessChallengeFor(null)}
                      />
                    )}

                    {/* Scrabble challenge inline setup */}
                    {scrabbleChallengeFor?.id === friend.id && (
                      <ScrabbleChallengeInline
                        friend={friend}
                        profileId={profileId}
                        myUsername={myUsername}
                        onSent={(gameId) => {
                          setScrabbleChallengeFor(null);
                          navigate(`/break/scrabble/mp/${gameId}`);
                          onClose();
                        }}
                        onCancel={() => setScrabbleChallengeFor(null)}
                      />
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {/* ── Find tab ─────────────────────────────────────────────── */}
          {tab === "find" && (
            <>
              <div className="flex gap-2 mb-3">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  placeholder="Search by username…"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "#fff" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                >
                  {searching ? "…" : "Search"}
                </button>
              </div>

              {searchResults.length === 0 && !searching && searchQuery && (
                <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.28)" }}>
                  No results for "{searchQuery}"
                </p>
              )}

              {searchResults.map((user) => {
                const isAlreadyFriend = friends.some((f) => f.id === user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
                  >
                    <Avatar name={user.username ?? user.full_name ?? "?"} src={user.avatar_url} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                        @{user.username ?? "—"}
                      </p>
                      {user.full_name && (
                        <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
                          {user.full_name}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] mr-1 shrink-0" style={{ color: "rgba(255,255,255,0.28)" }}>
                      ♟ {user.chess_elo}
                    </span>
                    {isAlreadyFriend ? (
                      <span className="text-[10px] px-2 py-1 rounded-lg" style={{ color: "#38E0C3", background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.2)" }}>
                        Friends
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(user.id)}
                        disabled={addingId === user.id}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50 shrink-0"
                        style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                      >
                        {addingId === user.id ? "…" : "+ Add"}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── Requests tab ─────────────────────────────────────────── */}
          {tab === "requests" && (
            <>
              {/* Received */}
              <div className="mb-4">
                <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Received ({receivedRequests.length})
                </p>
                {receivedRequests.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>No pending requests</p>
                ) : (
                  <div className="space-y-2">
                    {receivedRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl"
                        style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.15)" }}
                      >
                        <Avatar name={req.username ?? req.full_name ?? "?"} src={req.avatar_url} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                            @{req.username ?? req.full_name ?? "Someone"}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>wants to be friends</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                            style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeleteFriendship(req.id)}
                            className="px-3 py-1.5 rounded-lg text-[10px] transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent */}
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Sent ({sentRequests.length})
                </p>
                {sentRequests.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>No sent requests</p>
                ) : (
                  <div className="space-y-2">
                    {sentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
                      >
                        <Avatar name={req.username ?? req.full_name ?? "?"} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                            @{req.username ?? req.full_name ?? "—"}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>Request pending</p>
                        </div>
                        <button
                          onClick={() => handleDeleteFriendship(req.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] transition-all shrink-0"
                          style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Challenges tab ───────────────────────────────────────── */}
          {tab === "challenges" && (
            <>
              {/* Chess challenges */}
              {chessChallenges.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Chess ({chessChallenges.length})
                  </p>
                  <div className="space-y-2">
                    {chessChallenges.map((c) => {
                      const myColor = c.player1_color === "white" ? "Black ♚" : "White ♔";
                      const timeLabel = c.time_control === "unlimited" ? "∞" : c.time_control;
                      return (
                        <div
                          key={c.id}
                          className="px-3 py-3 rounded-xl"
                          style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.18)" }}
                        >
                          <div className="flex items-center gap-3 mb-2.5">
                            <Avatar name={c.username ?? "?"} src={c.avatar_url} size={32} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                                @{c.username ?? "Someone"} challenged you
                              </p>
                              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                                ♟ Chess · You play {myColor} · {timeLabel}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptChess(c.id)}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                              style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineChess(c.id)}
                              className="flex-1 py-1.5 rounded-lg text-[10px] transition-all"
                              style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TTT challenges */}
              {tttChallenges.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Tic-tac-toe ({tttChallenges.length})
                  </p>
                  <div className="space-y-2">
                    {tttChallenges.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
                      >
                        <div className="flex items-center gap-3 mb-2.5">
                          <Avatar name={c.username ?? "?"} src={c.avatar_url} size={32} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                              @{c.username ?? "Someone"} challenged you
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>✕○ Tic-tac-toe · You play O</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptTtt(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                            style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineTtt(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Draughts challenges */}
              {draughtsChallenges.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Draughts ({draughtsChallenges.length})
                  </p>
                  <div className="space-y-2">
                    {draughtsChallenges.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
                      >
                        <div className="flex items-center gap-3 mb-2.5">
                          <Avatar name={c.p1_username ?? "?"} size={32} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                              @{c.p1_username ?? "Someone"} challenged you
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>♟ Draughts · You play Red</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptDraughts(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                            style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineDraughts(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrabble challenges */}
              {scrabbleChallenges.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                    Scrabble ({scrabbleChallenges.length})
                  </p>
                  <div className="space-y-2">
                    {scrabbleChallenges.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
                      >
                        <div className="flex items-center gap-3 mb-2.5">
                          <Avatar name={c.host_username ?? "?"} size={32} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                              @{c.host_username ?? "Someone"} invited you
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>🔠 Scrabble · Multiplayer lobby</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptScrabble(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                            style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                          >
                            Join
                          </button>
                          <button
                            onClick={() => handleDeclineScrabble(c.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chessChallenges.length === 0 && tttChallenges.length === 0 && draughtsChallenges.length === 0 && scrabbleChallenges.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">🎮</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>No pending challenges</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BreakRoomPage() {
  const profile = useAuthStore((s) => s.profile);
  const userId = profile?.id;
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    if (profile && !profile.username) {
      const timer = setTimeout(() => setShowUsernameModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [profile?.username]);

  // Badge count for Friends button (pending requests + challenges)
  const { data: pendingBadge = 0 } = useQuery({
    queryKey: ["friends-badge", userId],
    queryFn: async () => {
      const [{ count: req }, { count: chess }, { count: ttt }, { count: draughts }, { data: scrabbleRows }] = await Promise.all([
        supabase.from("friendships").select("id", { count: "exact", head: true })
          .eq("addressee_id", userId!).eq("status", "pending"),
        supabase.from("chess_games").select("id", { count: "exact", head: true })
          .eq("player2_id", userId!).eq("status", "waiting").eq("game_type", "multiplayer"),
        supabase.from("ttt_games").select("id", { count: "exact", head: true })
          .eq("player_o_id", userId!).eq("status", "waiting"),
        supabase.from("draughts_games").select("id", { count: "exact", head: true })
          .eq("player2_id", userId!).eq("status", "waiting"),
        supabase.from("scrabble_mp_games").select("id")
          .contains("player_ids", [userId!]).eq("status", "lobby").neq("host_id", userId!),
      ]);
      const scrabble = (scrabbleRows ?? []).length;
      return (req ?? 0) + (chess ?? 0) + (ttt ?? 0) + (draughts ?? 0) + scrabble;
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const qcMain = useQueryClient();

  // Real-time badge updates — refetch badge when any new challenge arrives
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`badge-realtime-${userId}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "chess_games", filter: `player2_id=eq.${userId}` },
        () => qcMain.invalidateQueries({ queryKey: ["friends-badge", userId] }))
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "ttt_games", filter: `player_o_id=eq.${userId}` },
        () => qcMain.invalidateQueries({ queryKey: ["friends-badge", userId] }))
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "draughts_games", filter: `player2_id=eq.${userId}` },
        () => qcMain.invalidateQueries({ queryKey: ["friends-badge", userId] }))
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${userId}` },
        () => qcMain.invalidateQueries({ queryKey: ["friends-badge", userId] }))
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "scrabble_mp_games" },
        (payload: any) => {
          const row = payload.new as { player_ids: string[]; host_id: string };
          if (row.player_ids?.includes(userId) && row.host_id !== userId) {
            qcMain.invalidateQueries({ queryKey: ["friends-badge", userId] });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: activeChessGame } = useQuery({
    queryKey: ["active-chess", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chess_games")
        .select("id, moves_count, updated_at")
        .eq("user_id", userId!)
        .eq("status", "active")
        .or("game_type.eq.ai,game_type.is.null")
        .gt("moves_count", 0)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: activeScrabbleGame } = useQuery({
    queryKey: ["active-scrabble", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("scrabble_games")
        .select("id, score, updated_at")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return (
    <>
      <UsernameModal open={showUsernameModal} onDone={() => setShowUsernameModal(false)} />

      {showFriends && userId && (
        <FriendsDrawer onClose={() => setShowFriends(false)} profileId={userId} myUsername={profile?.username ?? null} />
      )}

      <div className="relative px-5 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto pb-28 md:pb-6">
        <motion.div variants={stagger} initial="hidden" animate="show">

          {/* Header */}
          <motion.div variants={fadeUp} className="mb-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-medium" style={{ color: "var(--text-primary)" }}>
                  Break Room
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Rest your brain — play a game
                </p>
              </div>

              {/* Right-side controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Friends button */}
                <button
                  onClick={() => setShowFriends(true)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.25)"; e.currentTarget.style.color = "#38E0C3"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                >
                  👥 Friends
                  {pendingBadge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-medium flex items-center justify-center px-1"
                      style={{ background: "#38E0C3", color: "#0a1628" }}
                    >
                      {pendingBadge}
                    </span>
                  )}
                </button>

                {/* Username badge */}
                {profile?.username ? (
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs"
                    style={{ background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.2)", color: "#38E0C3" }}
                  >
                    @{profile.username}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUsernameModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#38E0C3"; e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  >
                    Set username
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Game Cards */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            <GameCard
              icon={<ChessKnightSVG />}
              title="Chess"
              subtitle="Drag and drop · Move history · AI review"
              activeGame={activeChessGame ? { label: `${activeChessGame.moves_count ?? 0} moves played` } : null}
              resumeLink={activeChessGame ? `/break/chess/${activeChessGame.id}` : "/break/chess"}
              newLink="/break/chess"
              hasActive={!!activeChessGame}
            />

            <GameCard
              icon={
                <div className="flex gap-1">
                  {["S", "T", "U", "D", "Y"].map((l, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ background: "rgba(251,191,36,0.85)", border: "0.5px solid rgba(251,191,36,0.4)" }}
                    >
                      <span className="text-xs font-bold" style={{ color: "#1a1a1a" }}>{l}</span>
                    </div>
                  ))}
                </div>
              }
              title="Scrabble"
              subtitle="Solo play · Full dictionary · AI review"
              activeGame={activeScrabbleGame ? { label: `${activeScrabbleGame.score ?? 0} pts scored` } : null}
              resumeLink={activeScrabbleGame ? `/break/scrabble/${activeScrabbleGame.id}` : "/break/scrabble"}
              newLink="/break/scrabble"
              hasActive={!!activeScrabbleGame}
            />

            <GameCard
              icon={<DraughtsSVG />}
              title="Draughts"
              subtitle="Classic checkers · Kings & captures · AI opponent"
              activeGame={null}
              resumeLink="/break/draughts"
              newLink="/break/draughts"
              hasActive={false}
            />

            <GameCard
              icon={
                <div
                  className="w-14 h-14 flex items-center justify-center rounded-xl text-3xl select-none"
                  style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.15)" }}
                >
                  ✕○
                </div>
              }
              title="Tic-tac-toe"
              subtitle="Solo vs AI · Multiplayer with friends"
              activeGame={null}
              resumeLink="/break/ttt"
              newLink="/break/ttt"
              hasActive={false}
            />

            <GameCard
              icon={
                <div className="flex gap-2 items-center">
                  {['⚡', '🎯', '🔀'].map((icon, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-xl"
                      style={{ background: 'rgba(56,224,195,0.08)', border: '0.5px solid rgba(56,224,195,0.18)' }}
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              }
              title="Study Games"
              subtitle="Flash Sprint · Quick Quiz · Word Scramble"
              activeGame={null}
              resumeLink="/break/study"
              newLink="/break/study"
              hasActive={false}
            />
          </motion.div>

        </motion.div>
      </div>
    </>
  );
}

// ─── Supporting components ─────────────────────────────────────────────────────

function DraughtsSVG() {
  return (
    <div className="flex gap-2 items-end">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: i === 1 ? 36 : 28,
            height: i === 1 ? 36 : 28,
            background: i % 2 === 0 ? "rgba(56,224,195,0.7)" : "rgba(200,50,50,0.7)",
            border: `2px solid ${i % 2 === 0 ? "rgba(56,224,195,1)" : "rgba(200,50,50,1)"}`,
          }}
        />
      ))}
    </div>
  );
}

function ChessKnightSVG() {
  return (
    <svg viewBox="0 0 45 45" className="w-14 h-14" fill="none">
      <g style={{ fill: "rgba(56,224,195,0.65)", stroke: "rgba(56,224,195,0.4)", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }}>
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
        <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" style={{ fill: "rgba(56,224,195,0.9)", stroke: "none" }} />
        <path d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z" style={{ fill: "rgba(56,224,195,0.9)", stroke: "none" }} transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" />
      </g>
    </svg>
  );
}

interface GameCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  activeGame: { label: string } | null;
  resumeLink: string;
  newLink: string;
  hasActive: boolean;
}

function GameCard({ icon, title, subtitle, activeGame, resumeLink, newLink, hasActive }: GameCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-2xl p-7 transition-all duration-150"
      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
    >
      <div className="mb-5">{icon}</div>
      <h2 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-dim)" }}>{subtitle}</p>

      {activeGame && (
        <div
          className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl"
          style={{ background: "rgba(56,224,195,0.06)", border: "0.5px solid rgba(56,224,195,0.15)" }}
        >
          <span className="text-sm">🎮</span>
          <span className="text-xs" style={{ color: "#38E0C3" }}>{activeGame.label}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => navigate(resumeLink)}
          className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ background: "rgba(56,224,195,0.09)", border: "0.5px solid rgba(56,224,195,0.22)", color: "#38E0C3" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,224,195,0.15)"; e.currentTarget.style.borderColor = "rgba(56,224,195,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(56,224,195,0.09)"; e.currentTarget.style.borderColor = "rgba(56,224,195,0.22)"; }}
        >
          {hasActive ? "Resume →" : "New Game"}
        </button>
        {hasActive && (
          <Link
            to={newLink}
            className="py-2.5 px-4 rounded-xl text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            New
          </Link>
        )}
      </div>
    </div>
  );
}
