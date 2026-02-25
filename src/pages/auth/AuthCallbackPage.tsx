import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/authStore";
import { supabaseUserToAppUser } from "@/modules/auth/supabaseUserToAppUser";
import { supabase } from "@/shared/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizeNext = (value: string | null): string | null => {
    const v = String(value ?? "").trim();
    if (!v) return null;
    if (!v.startsWith("/")) return null;
    if (v.startsWith("//")) return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return null;
    return v;
  };

  const normalizeError = (message: string): string => {
    const msg = String(message || "");
    if (/PKCE code verifier not found in storage/i.test(msg)) {
      return "Falha ao concluir o login (PKCE). Verifique se você iniciou e concluiu o login no mesmo endereço (ex.: sempre em http://localhost:3000, sem alternar para o IP da rede), e sem limpar o storage do navegador durante o fluxo.";
    }
    return msg || "Erro ao concluir login.";
  };

  useEffect(() => {
    if (!supabase) {
      navigate("/", { replace: true });
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      const url = new URL(window.location.href);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type") || url.searchParams.get("type");
      const hashError =
        hashParams.get("error_description") ||
        hashParams.get("error") ||
        hashParams.get("error_code");
      const code = url.searchParams.get("code");
      const next = sanitizeNext(url.searchParams.get("next"));

      try {
        if (hashError) {
          setError(normalizeError(decodeURIComponent(String(hashError))));
          return;
        }

        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) {
            setError(normalizeError(setErr.message));
            return;
          }
        } else if (code) {
          const { error: exchangeErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            setError(normalizeError(exchangeErr.message));
            return;
          }
        }

        url.hash = "";
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        window.history.replaceState(null, "", url.pathname + url.search);

        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setError(normalizeError(sessionErr.message));
          return;
        }
        if (!data.session?.user) {
          setError("Sessão não encontrada após o login.");
          return;
        }
        setUser(supabaseUserToAppUser(data.session.user, null));
        const target =
          next || (String(type).toLowerCase() === "recovery" ? "/auth/recover" : "/pelada");
        navigate(target, { replace: true });
      } catch (e) {
        setError(normalizeError(e instanceof Error ? e.message : "Erro ao concluir login."));
      }
    };

    void run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
      {error ? (
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <div className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </div>
          <button
            className="mt-6 w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-400 transition-all active:scale-95"
            onClick={() => navigate("/", { replace: true })}
            type="button"
          >
            Voltar
          </button>
        </div>
      ) : (
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      )}
    </div>
  );
}

