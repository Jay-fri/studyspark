import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

const FONT_SIZE_MAP = { small: "13px", medium: "14px", large: "16px", xl: "18px", xxl: "20px" } as const;

export function useTheme() {
  const { theme, setTheme, density, fontSize } = useUIStore();

  // Always dark
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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
