import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg", className)}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

export function NotebookCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 space-y-3.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        minHeight: 160,
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        <Skeleton className="h-3 rounded-full w-28" />
      </div>
      <Skeleton className="h-2.5 rounded-full w-full" />
      <Skeleton className="h-2.5 rounded-full w-3/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
      </div>
    </div>
  );
}

export function ActivityRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5"
      style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}
    >
      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-2.5 rounded-full w-40" />
        <Skeleton className="h-2 rounded-full w-24" />
      </div>
      <Skeleton className="h-2 rounded-full w-10 shrink-0" />
    </div>
  );
}
