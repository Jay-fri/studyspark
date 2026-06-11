import { motion } from "framer-motion";

interface Props {
  active: boolean;
  onClick: () => void;
  size?: number;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 24 };
const BAR = "rgba(255,255,255,0.72)";

export function AnimatedHamburger({ active, onClick, size = 32 }: Props) {
  const fullW  = Math.round(size * 0.52);
  const shortW = Math.round(size * 0.32);
  const cy     = Math.round((size - 1.5) / 2);
  const t1     = Math.round(size * 0.28);
  const t3     = Math.round(size * 0.68);

  return (
    <button
      onClick={onClick}
      aria-label={active ? "Close" : "Menu"}
      className="relative flex items-center justify-center rounded-lg shrink-0 transition-colors duration-150 hover:bg-white/[0.07]"
      style={{ width: size, height: size }}
    >
      {/* Top bar → diagonal \ when open */}
      <motion.span
        className="absolute rounded-full"
        style={{ height: 1.5, background: BAR, left: "50%", x: "-50%", transformOrigin: "center" }}
        animate={active
          ? { width: fullW,  top: cy, rotate:  45, opacity: 1 }
          : { width: fullW,  top: t1, rotate:   0, opacity: 1 }}
        transition={spring}
      />
      {/* Middle bar → fades out */}
      <motion.span
        className="absolute rounded-full"
        style={{ height: 1.5, background: BAR, left: "50%", x: "-50%", top: cy }}
        animate={active
          ? { width: fullW, opacity: 0, scaleX: 0 }
          : { width: fullW, opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.13 }}
      />
      {/* Bottom bar — shorter + dimmer when closed, full + diagonal / when open */}
      <motion.span
        className="absolute rounded-full"
        style={{ height: 1.5, background: BAR, left: "50%", x: "-50%", transformOrigin: "center" }}
        animate={active
          ? { width: fullW,  top: cy, rotate: -45, opacity: 1   }
          : { width: shortW, top: t3, rotate:   0, opacity: 0.45 }}
        transition={spring}
      />
    </button>
  );
}
