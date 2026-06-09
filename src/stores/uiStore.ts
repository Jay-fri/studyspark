import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Density  = "compact" | "comfortable";
export type FontSize = "small" | "medium" | "large" | "xl" | "xxl";

interface UIState {
  sidebarOpen:             boolean;
  sidebarCollapsed:        boolean;
  theme:                   "light" | "dark" | "system";
  density:                 Density;
  fontSize:                FontSize;
  emailNotifications:      boolean;
  lowTokenWarnings:        boolean;
  tokenBannerDismissedAt:  number | null;
  mobileDrawerOpen:        boolean;
  commandPaletteOpen:      boolean;
  paymentModalOpen:        boolean;

  toggleSidebar:          () => void;
  setSidebarOpen:         (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTheme:               (t: "light" | "dark" | "system") => void;
  setDensity:             (d: Density) => void;
  setFontSize:            (s: FontSize) => void;
  setEmailNotifications:  (v: boolean) => void;
  setLowTokenWarnings:    (v: boolean) => void;
  dismissTokenBanner:     () => void;
  setMobileDrawerOpen:    (open: boolean) => void;
  setCommandPaletteOpen:  (open: boolean) => void;
  setPaymentModalOpen:    (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen:            true,
      sidebarCollapsed:       false,
      theme:                  "system",
      density:                "comfortable",
      fontSize:               "large",
      emailNotifications:     true,
      lowTokenWarnings:       true,
      tokenBannerDismissedAt: null,
      mobileDrawerOpen:       false,
      commandPaletteOpen:     false,
      paymentModalOpen:       false,

      toggleSidebar:          () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen:         (open)    => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: ()        => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme:               (theme)   => set({ theme }),
      setDensity:             (density) => set({ density }),
      setFontSize:            (fontSize)=> set({ fontSize }),
      setEmailNotifications:  (v)       => set({ emailNotifications: v }),
      setLowTokenWarnings:    (v)       => set({ lowTokenWarnings: v }),
      dismissTokenBanner:     ()        => set({ tokenBannerDismissedAt: Date.now() }),
      setMobileDrawerOpen:    (open)    => set({ mobileDrawerOpen: open }),
      setCommandPaletteOpen:  (open)    => set({ commandPaletteOpen: open }),
      setPaymentModalOpen:    (open)    => set({ paymentModalOpen: open }),
    }),
    {
      name: "studylm-ui",
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2 && persisted.fontSize === "medium") {
          persisted.fontSize = "large";
        }
        return persisted;
      },
      partialize: (s) => ({
        sidebarCollapsed:       s.sidebarCollapsed,
        theme:                  s.theme,
        density:                s.density,
        fontSize:               s.fontSize,
        emailNotifications:     s.emailNotifications,
        lowTokenWarnings:       s.lowTokenWarnings,
        tokenBannerDismissedAt: s.tokenBannerDismissedAt,
      }),
    }
  )
);
