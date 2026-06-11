import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MINT = "#38E0C3";
const MINT_DARK = "#28c4aa";

const Drip: React.FC<{ left: string; height: number; delay: number }> = ({ left, height, delay }) => (
  <motion.div
    className="absolute top-[99%] origin-top pointer-events-none"
    style={{ left }}
    initial={{ scaleY: 0.75 }}
    animate={{ scaleY: [0.75, 1, 0.75] }}
    transition={{ duration: 2, times: [0, 0.25, 1], delay, ease: "easeIn", repeat: Infinity, repeatDelay: 2 }}
  >
    <div style={{ height, background: MINT }} className="w-2 rounded-b-full group-hover:opacity-80" />

    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="absolute left-full top-0">
      <g clipPath="url(#c1)">
        <path fillRule="evenodd" clipRule="evenodd" d="M5.4 0H0V5.4C0 2.41765 2.41766 0 5.4 0Z" fill={MINT} />
      </g>
      <defs><clipPath id="c1"><rect width="6" height="6" fill="white" /></clipPath></defs>
    </svg>

    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="absolute right-full top-0 rotate-90">
      <g clipPath="url(#c2)">
        <path fillRule="evenodd" clipRule="evenodd" d="M5.4 0H0V5.4C0 2.41765 2.41766 0 5.4 0Z" fill={MINT} />
      </g>
      <defs><clipPath id="c2"><rect width="6" height="6" fill="white" /></clipPath></defs>
    </svg>

    <motion.div
      initial={{ y: -8, opacity: 1 }}
      animate={{ y: [-8, 50], opacity: [1, 0] }}
      transition={{ duration: 2, times: [0, 1], delay, ease: "easeIn", repeat: Infinity, repeatDelay: 2 }}
      className="absolute top-full h-2 w-2 rounded-full"
      style={{ background: MINT }}
    />
  </motion.div>
);

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
        "group relative rounded-[9px] px-5 py-2.5 text-sm font-medium text-[#0a1628] transition-colors overflow-visible disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      style={{ background: MINT }}
      onMouseEnter={(e) => (e.currentTarget.style.background = MINT_DARK)}
      onMouseLeave={(e) => (e.currentTarget.style.background = MINT)}
    >
      {children}
      <Drip left="10%" height={24} delay={0.5} />
      <Drip left="30%" height={20} delay={3} />
      <Drip left="57%" height={10} delay={4.25} />
      <Drip left="85%" height={16} delay={1.5} />
    </button>
  );
}
