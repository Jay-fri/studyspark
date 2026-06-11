import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MintShimmerButton({
  children,
  onClick,
  className,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative overflow-hidden px-4 py-2 rounded-[9px] text-sm font-medium text-[#38E0C3] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{
        background: "rgba(56,224,195,0.12)",
        border: "0.5px solid rgba(56,224,195,0.3)",
      }}
      onHoverStart={(e) => ((e.target as HTMLElement).style.background = "rgba(56,224,195,0.18)")}
      onHoverEnd={(e) => ((e.target as HTMLElement).style.background = "rgba(56,224,195,0.12)")}
    >
      <motion.div
        className="absolute inset-0 skew-x-12 pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent, rgba(56,224,195,0.15), transparent)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
