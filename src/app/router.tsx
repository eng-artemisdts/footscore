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
    async function loadUser(sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) {
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
        setUser(
          supabaseUserToAppUser(
            sessionUser as Parameters<typeof supabaseUserToAppUser>[0],
            p,
          ),
        );
      } catch {
        setUser(
          supabaseUserToAppUser(
            sessionUser as Parameters<typeof supabaseUserToAppUser>[0],
            null,
          ),
        );
      }
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUser(session.user);
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUser(session.user);
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
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
