import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/supabase";

export function AuthRecoverPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      navigate("/", { replace: true });
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setHasSession(!!data.session?.user);
      } finally {
        setSessionChecked(true);
      }
    })();
  }, [navigate]);

  const canSubmit = useMemo(() => {
    if (!hasSession) return false;
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return !loading;
  }, [confirmPassword, hasSession, loading, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setSuccess(null);

    if (!hasSession) {
      setError("Seu link expirou. Solicite um novo e-mail de recuperação.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message || "Não foi possível atualizar sua senha.");
        return;
      }
      setSuccess("Senha atualizada. Entrando...");
      window.setTimeout(() => navigate("/pelada", { replace: true }), 700);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Não foi possível atualizar sua senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 overflow-hidden relative font-normal">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <img
            src="/logo.svg"
            alt="FutScore"
            className="w-16 h-16 rounded-2xl shadow-2xl shadow-cyan-500/20 mb-6 hover:scale-110 transition-transform"
            draggable={false}
          />
          <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">
            Nova senha
          </h1>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] text-center">
            Defina uma senha para sua conta
          </p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 sm:p-10 shadow-2xl">
          {!sessionChecked ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-200 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                  {success}
                </div>
              )}

              {!hasSession ? (
                <div className="space-y-4">
                  <div className="text-white/60 text-sm leading-relaxed">
                    Seu link de recuperação parece inválido ou expirado.
                  </div>
                  <button
                    type="button"
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-400 transition-all active:scale-95"
                    onClick={() => navigate("/", { replace: true })}
                  >
                    Voltar para entrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">
                      Nova senha
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">
                      Confirmar senha
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-400 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      "Salvar nova senha"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/", { replace: true })}
                    className="w-full bg-white/5 border border-white/10 text-white/60 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white/80 transition"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

