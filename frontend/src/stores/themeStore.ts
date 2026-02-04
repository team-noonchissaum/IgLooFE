import { create } from "zustand";
import { persist } from "zustand/middleware";

const THEME_KEY = "igloo-theme";

function applyDark(dark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
}

// 초기 로드 시 저장된 테마 적용 (SSR/hydration 전)
let initialDark = false;
if (typeof localStorage !== "undefined") {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      initialDark = data?.state?.isDark === true;
    }
  } catch {
    // ignore
  }
}
applyDark(initialDark);

interface ThemeState {
  isDark: boolean;
  setDark: (dark: boolean) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: initialDark,
      setDark: (dark) => {
        set({ isDark: dark });
        applyDark(dark);
      },
      toggle: () => {
        const next = !get().isDark;
        set({ isDark: next });
        applyDark(next);
      },
    }),
    {
      name: THEME_KEY,
      onRehydrateStorage: () => (state) => {
        if (state?.isDark != null) applyDark(state.isDark);
      },
    },
  ),
);
