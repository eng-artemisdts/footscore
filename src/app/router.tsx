import React, { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthPage } from "@/pages/auth/AuthPage";
import { PeladaPage } from "@/pages/pelada/PeladaPage";
import { PeladaSelectPage } from "@/pages/peladaSelect/PeladaSelectPage";
import { ViewOnlyPage } from "@/pages/view/ViewOnlyPage";
import { useAuthStore } from "@/modules/auth/authStore";
import { supabaseUserToAppUser } from "@/modules/auth/supabaseUserToAppUser";
import { supabase } from "@/shared/supabase";
import { Plan, SubscriptionStatus } from "@/shared/types";

export function AppRouter() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [authChecked, setAuthChecked] = useState(!supabase);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    let cancelled = false;
    async function hydrateUser(sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) {
      if (cancelled) return;
      setUser(supabaseUserToAppUser(sessionUser, null));
      try {
        const { data: profile } = await supabase!
          .from("profiles")
          .select("plan, subscription_status, stripe_customer_id")
          .eq("id", sessionUser.id)
          .maybeSingle();
        const p = profile as {
          plan: Plan;
          subscription_status: SubscriptionStatus;
          stripe_customer_id?: string | null;
        } | null;
        if (cancelled) return;
        const current = useAuthStore.getState().user;
        if (current?.id !== sessionUser.id) return;
        setUser(
          supabaseUserToAppUser(
            sessionUser as Parameters<typeof supabaseUserToAppUser>[0],
            p,
          ),
        );
      } catch {
        if (cancelled) return;
      }
    }

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), ms),
        ),
      ]);
    };

    (async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          8000,
        );
        if (cancelled) return;
        if (session?.user) {
          void hydrateUser(session.user);
        } else if (!useAuthStore.getState().user) {
          setUser(null);
        }
      } catch {
        if (!cancelled && !useAuthStore.getState().user) setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          void hydrateUser(session.user);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      } catch {
        if (event === "SIGNED_OUT") setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setUser]);

  if (location.pathname === "/view" || location.pathname.endsWith("/view")) {
    return <ViewOnlyPage />;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/pelada" replace /> : <AuthPage />}
      />
      <Route
        path="/pelada"
        element={
          user ? (
            <PeladaSelectPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/pelada/:peladaSlug"
        element={user ? <PeladaPage /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to={user ? "/pelada" : "/"} replace />} />
    </Routes>
  );
}
