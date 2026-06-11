interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{
        background: "rgba(249,115,22,0.1)",
        border: "0.5px solid rgba(249,115,22,0.25)",
        color: "#F97316",
      }}
    >
      <span>🔥</span>
      <span>{streak}</span>
    </div>
  );
}
