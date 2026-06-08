import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

const FONT_SIZE_MAP = { small: "13px", medium: "14px", large: "16px" } as const;

export function useTheme() {
  const { theme, setTheme, density, fontSize } = useUIStore();

  // Dark / light / system
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      document.documentElement.classList.toggle("dark", e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Density — data attribute drives CSS custom properties
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  // Font size — set on root so rem units scale everything
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
  }, [fontSize]);

  return { theme, setTheme };
}
