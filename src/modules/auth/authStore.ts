import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/shared/types";
import { supabase } from "@/shared/supabase";

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isAdminForPelada: (peladaUserId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        set({ user: null });
        try {
          localStorage.removeItem("pelada_user");
        } catch {}
        const signOutPromise = supabase?.auth.signOut();
        if (!signOutPromise) return;
        try {
          await Promise.race([
            signOutPromise,
            new Promise<void>((resolve) => setTimeout(resolve, 4000)),
          ]);
        } catch {}
      },
      isAdminForPelada: (peladaUserId) => {
        const current = get().user;
        return !!current && current.id === peladaUserId;
      },
    }),
    {
      name: "pelada_user",
    },
  ),
);

