import React from "react";
import { cn } from "@/lib/utils";

export function WetPaintButton({
  children,
  className,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{ background: "#38E0C3", color: "#0a1628" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#2ccdb5"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#38E0C3"; }}
      onMouseDown={(e)  => { e.currentTarget.style.background = "#28bca6"; }}
      onMouseUp={(e)    => { e.currentTarget.style.background = "#2ccdb5"; }}
    >
      {children}
    </button>
  );
}
