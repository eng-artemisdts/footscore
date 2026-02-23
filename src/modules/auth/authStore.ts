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
        try {
          await supabase?.auth.signOut();
        } finally {
          set({ user: null });
        }
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

