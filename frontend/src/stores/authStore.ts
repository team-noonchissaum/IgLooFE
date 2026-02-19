import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  setTokens: (access: string, refresh: string, role?: string | null) => void;
  setRole: (role: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      setTokens: (access, refresh, role = null) =>
        set({ accessToken: access, refreshToken: refresh, role: role ?? null }),
      setRole: (role) => set({ role }),
      logout: () => set({ accessToken: null, refreshToken: null, role: null }),
      isAuthenticated: () => !!get().accessToken,
      isAdmin: () => get().role === "ADMIN",
    }),
    { name: "igloo-auth" }
  )
);
