
import type { Account } from "@/services/api-types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "./app-storage";

interface AuthState {
  token: string | null;
  secretKey: string | null;
  account: Account | null;
  setToken: (token: string, secretKey?: string) => void;
  setAccount: (account: Account | null) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      secretKey: null,
      account: null,

      setToken: (token, secretKey) =>
        set((state) => ({
          token,
          secretKey: secretKey ?? state.secretKey,
        })),

      setAccount: (account) => set({ account }),

      clearToken: () =>
        set({ token: null, secretKey: null, account: null }),
    }),
    {
      name: "auth-storage",
      version: 1,
      storage: createJSONStorage(() => appStorage),

      // Never persist credentials in SQLite.
      partialize: (state) => ({
        token: null,
        secretKey: null,
        account: state.account,
      }),

      // Clean credentials saved by the previous version.
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState>;

        return {
          token: null,
          secretKey: null,
          account: state.account ?? null,
        };
      },
    }
  )
);
