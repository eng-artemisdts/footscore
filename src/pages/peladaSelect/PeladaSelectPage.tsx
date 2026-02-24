import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { peladaSlug } from "@/shared/utils";
import { Pelada } from "@/shared/types";
import { useAuthStore } from "@/modules/auth/authStore";
import { createCheckoutSession, createPortalSession } from "@/modules/billing/stripe";
import { supabase } from "@/shared/supabase";
import { env } from "@/shared/env";
import { joinPelada } from "@/modules/peladas/joinPelada";
import { CreatePeladaModal } from "./components/CreatePeladaModal";
import { deletePelada, savePelada, usePeladas } from "./hooks/usePeladasStorage";
import { useToast } from "@/shared/ui/ToastProvider";
import { useConfirm } from "@/shared/ui/ConfirmProvider";

const PENDING_PELADA_JOIN_KEY = "pending_pelada_join";
const MAX_PELADAS_PER_USER = 3;
const SWIPE_ACTION_WIDTH_PX = 96;

type PeladaRowProps = {
  pelada: Pelada;
  canDelete: boolean;
  isOpen: boolean;
  setOpenPeladaId: (id: string | null) => void;
  anyDeleting: boolean;
  deletingThis: boolean;
  onSelect: (pelada: Pelada) => void;
  onDelete: (pelada: Pelada) => void;
};

const PeladaRow: React.FC<PeladaRowProps> = ({
  pelada,
  canDelete,
  isOpen,
  setOpenPeladaId,
  anyDeleting,
  deletingThis,
  onSelect,
  onDelete,
}) => {
  const [offset, setOffset] = useState(isOpen ? SWIPE_ACTION_WIDTH_PX : 0);
  const [dragging, setDragging] = useState(false);
  const contentRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseOffset: number;
    lockedAxis: "x" | "y" | null;
    active: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (dragging) return;
    setOffset(isOpen ? SWIPE_ACTION_WIDTH_PX : 0);
  }, [dragging, isOpen]);

  const close = () => setOpenPeladaId(null);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {canDelete && (isOpen || offset > 8) && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
          style={{
            pointerEvents: anyDeleting ? "none" : "auto",
            opacity: Math.min(1, offset / 16),
          }}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pelada);
            }}
            disabled={anyDeleting}
            className="w-[96px] flex items-center justify-center bg-red-500/20 text-red-200 hover:bg-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed rounded-r-2xl"
            aria-label={`Excluir pelada ${pelada.name}`}
            title="Excluir"
          >
            {deletingThis ? "..." : "×"}
          </button>
        </div>
      )}

      <button
        ref={contentRef}
        type="button"
        onPointerDown={(e) => {
          if (!canDelete) return;
          if (anyDeleting) return;
          suppressClickRef.current = false;
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            baseOffset: isOpen ? SWIPE_ACTION_WIDTH_PX : 0,
            lockedAxis: null,
            active: false,
          };
          setDragging(false);
          contentRef.current?.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!canDelete) return;
          const d = dragRef.current;
          if (!d || d.pointerId !== e.pointerId) return;

          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;

          if (!d.lockedAxis) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            d.lockedAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            if (d.lockedAxis !== "x") return;
          }

          if (d.lockedAxis !== "x") return;
          if (Math.abs(dx) < 12) return;

          if (!d.active) {
            d.active = true;
            setDragging(true);
          }

          const next = Math.max(
            0,
            Math.min(SWIPE_ACTION_WIDTH_PX, d.baseOffset - dx),
          );
          setOffset(next);
        }}
        onPointerUp={(e) => {
          if (!canDelete) return;
          const d = dragRef.current;
          if (!d || d.pointerId !== e.pointerId) return;
          dragRef.current = null;

          if (!d.active) return;

          suppressClickRef.current = true;
          globalThis.setTimeout(() => {
            suppressClickRef.current = false;
          }, 250);

          setDragging(false);
          const shouldOpen = offset >= SWIPE_ACTION_WIDTH_PX * 0.45;
          setOpenPeladaId(shouldOpen ? pelada.id : null);
          setOffset(shouldOpen ? SWIPE_ACTION_WIDTH_PX : 0);
        }}
        onPointerCancel={(e) => {
          if (!canDelete) return;
          const d = dragRef.current;
          if (!d || d.pointerId !== e.pointerId) return;
          dragRef.current = null;
          setDragging(false);
          setOffset(isOpen ? SWIPE_ACTION_WIDTH_PX : 0);
        }}
        onClick={() => {
          if (suppressClickRef.current) {
            return;
          }
          if (isOpen) {
            close();
            return;
          }
          onSelect(pelada);
        }}
        className={[
          "relative z-10 w-full text-left py-4 px-5 sm:py-5 sm:px-6 active:scale-[0.99] group flex items-center gap-4 min-w-0 touch-pan-y bg-black/30 border border-white/10 rounded-2xl hover:bg-white/[0.06] hover:border-cyan-500/25 transition-all duration-200",
          dragging ? "" : "transition-transform duration-200 ease-out",
        ].join(" ")}
        style={{ transform: `translateX(-${offset}px)` }}
      >
        <span className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0 group-hover:bg-cyan-500/20 transition-colors">
          ⚽
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-black text-sm sm:text-base uppercase tracking-tight text-white group-hover:text-cyan-300 transition-colors block truncate">
            {pelada.name}
          </span>
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
            Entrar na pelada →
          </span>
        </div>
        <span
          className="text-white/20 group-hover:text-cyan-400 text-xl leading-none transition-colors shrink-0"
          aria-hidden
        >
          →
        </span>
      </button>
    </div>
  );
};

export const PeladaSelectPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [peladasReloadKey, setPeladasReloadKey] = useState(0);
  const [deletingPeladaId, setDeletingPeladaId] = useState<string | null>(null);
  const [openPeladaId, setOpenPeladaId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  if (!user) return null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const joinHandledRef = useRef(false);
  useEffect(() => {
    if (!user?.id) return;
    if (joinHandledRef.current) return;
    joinHandledRef.current = true;

    const raw = (() => {
      try {
        return localStorage.getItem(PENDING_PELADA_JOIN_KEY);
      } catch {
        return null;
      }
    })();
    if (!raw) return;

    const parsed = (() => {
      try {
        return JSON.parse(raw) as {
          peladaId?: string;
          peladaName?: string;
          slug?: string | null;
          createdAt?: number;
        };
      } catch {
        return null;
      }
    })();

    const peladaId = (parsed?.peladaId ?? "").trim();
    const peladaName = (parsed?.peladaName ?? "").trim();
    const slug = (parsed?.slug ?? "").trim();
    const createdAt = typeof parsed?.createdAt === "number" ? parsed!.createdAt : 0;
    const expired = !createdAt || Date.now() - createdAt > 1000 * 60 * 60 * 12;

    if (!peladaId || !peladaName || expired) {
      try {
        localStorage.removeItem(PENDING_PELADA_JOIN_KEY);
      } catch {}
      return;
    }

    const run = async () => {
      const ok = await confirm({
        title: "Entrar na pelada",
        message: `Deseja entrar na pelada "${peladaName}"?`,
        confirmText: "Entrar",
        cancelText: "Cancelar",
      });
      if (!ok) {
        try {
          localStorage.removeItem(PENDING_PELADA_JOIN_KEY);
        } catch {}
        return;
      }

      try {
        await joinPelada(peladaId, user.id);
        try {
          localStorage.removeItem(PENDING_PELADA_JOIN_KEY);
        } catch {}
        const targetSlug = slug || peladaSlug(peladaName);
        navigate(`/pelada/${targetSlug}`, { replace: true });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível entrar na pelada.", {
          title: "Falha ao entrar",
        });
      }
    };

    void run();
  }, [confirm, navigate, toast, user?.id]);

  const { peladas, loading: peladasLoading } = usePeladas(
    user.id,
    `${showModal ? 1 : 0}-${peladasReloadKey}`,
  );
  const isPro = user.plan === "pro";
  const reachedPeladaLimit = peladas.length >= MAX_PELADAS_PER_USER;
  const canCreatePelada = isPro && !reachedPeladaLimit;

  const handleCreate = async (pelada: Pelada) => {
    if (!canCreatePelada) {
      toast.info(`Limite de ${MAX_PELADAS_PER_USER} peladas por usuário atingido.`, {
        title: "Peladas",
      });
      setShowModal(false);
      return;
    }
    await savePelada(user.id, pelada);
    setShowModal(false);
    navigate(`/pelada/${peladaSlug(pelada.name)}`, { replace: true });
  };

  const handleSelect = (pelada: Pelada) => {
    setOpenPeladaId(null);
    navigate(`/pelada/${peladaSlug(pelada.name)}`);
  };

  const handleDelete = async (pelada: Pelada) => {
    if (deletingPeladaId) return;
    setOpenPeladaId(null);
    const ok = await confirm({
      title: "Excluir pelada",
      message: `Tem certeza que deseja excluir a pelada "${pelada.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    setDeletingPeladaId(pelada.id);
    try {
      await deletePelada(pelada.id);
      toast.success("Pelada excluída.", { title: "Peladas" });
      setPeladasReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir a pelada.", {
        title: "Falha",
      });
    } finally {
      if (mountedRef.current) setDeletingPeladaId(null);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      session = refreshData?.session ?? null;
    }
    const token = session?.access_token ?? null;
    if (!token) return null;

    const payloadPart = token.split(".")[1] ?? "";
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

    try {
      const decoded = JSON.parse(atob(padded)) as { iss?: string };
      const iss = decoded?.iss ?? "";
      if (!iss || !iss.startsWith(env.VITE_SUPABASE_URL)) {
        await supabase.auth.signOut();
        return null;
      }
    } catch {
      return null;
    }

    return token;
  };

  const handleUpgrade = async () => {
    if (!supabase) {
      setUpgradeError("Upgrade não disponível sem conexão com o servidor.");
      return;
    }
    setUpgradeError(null);
    setUpgradeLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setUpgradeError("Sessão expirada. Saia e entre novamente para fazer upgrade.");
        return;
      }
      const successUrl = new URL("/pelada?upgraded=1", window.location.origin).toString();
      const cancelUrl = new URL("/pelada", window.location.origin).toString();
      const url = await createCheckoutSession(successUrl, cancelUrl, token);
      window.location.href = url;
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : "Erro ao abrir checkout.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!supabase) {
      setUpgradeError("Portal não disponível sem conexão com o servidor.");
      return;
    }
    setUpgradeError(null);
    setUpgradeLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setUpgradeError("Sessão expirada. Saia e entre novamente.");
        return;
      }
      const returnUrl = new URL("/pelada", window.location.origin).toString();
      const url = await createPortalSession(returnUrl, token);
      window.location.href = url;
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : "Erro ao abrir portal.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const firstName = user.name?.trim().split(" ")[0] || "Craque";

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      if (mountedRef.current) setLogoutLoading(false);
    }
    if (mountedRef.current) navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 overflow-hidden relative font-normal">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src="/logo.svg"
            alt="FutScore"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-2xl shadow-cyan-500/20 mb-4 hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
          <p className="text-[10px] font-bold text-cyan-400/90 uppercase tracking-[0.25em] mb-3">
            Olá, {firstName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase mb-1 text-white">
            Escolha a pelada
          </h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
            {isPro
              ? reachedPeladaLimit
                ? `Limite de ${MAX_PELADAS_PER_USER} peladas atingido`
                : "Ou crie uma nova"
              : "Plano Free — faça upgrade para criar peladas"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPro ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/10 text-white/50 border border-white/10"}`}
            >
              {isPro ? "Plano Pro" : "Plano Free"}
            </span>
            {isPro && user.stripeCustomerId && (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={upgradeLoading}
                className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-cyan-400 transition-colors disabled:opacity-50"
              >
                {upgradeLoading ? "Abrindo..." : "Gerenciar assinatura"}
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:opacity-50"
            >
              {logoutLoading ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-2xl">
          {upgradeError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest text-center space-y-2">
              <p>{upgradeError}</p>
              {(upgradeError.includes("Sessão") || upgradeError.includes("expir")) && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest transition-colors"
                >
                  Fazer login novamente
                </button>
              )}
            </div>
          )}
          {peladasLoading && peladas.length === 0 ? (
            <div className="py-12 sm:py-16 text-center border-2 border-dashed border-white/10 rounded-3xl mb-6 bg-black/20">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">
                Carregando peladas...
              </p>
              <div className="w-5 h-5 mx-auto border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : peladas.length === 0 ? (
            <div className="py-12 sm:py-16 text-center border-2 border-dashed border-white/10 rounded-3xl mb-6 bg-black/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-4xl">
                ⚽
              </div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">
                {isPro ? "Nenhuma pelada ainda" : "Crie peladas com o Plano Pro"}
              </p>
              <p className="text-white/40 text-sm font-medium max-w-[220px] mx-auto leading-relaxed">
                {isPro
                  ? "Crie sua primeira pelada para começar a gerenciar o elenco."
                  : "No plano gratuito você pode entrar em peladas pelo link. Faça upgrade para criar e administrar as suas."}
              </p>
              {!isPro && (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  className="mt-4 px-6 py-3 rounded-xl bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                >
                  {upgradeLoading ? (
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>Fazer upgrade</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3 px-1">
                Suas peladas
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                {peladas.map((p) => (
                  <li key={p.id}>
                    <PeladaRow
                      pelada={p}
                      canDelete={p.userId === user.id}
                      isOpen={openPeladaId === p.id}
                      setOpenPeladaId={setOpenPeladaId}
                      anyDeleting={!!deletingPeladaId}
                      deletingThis={deletingPeladaId === p.id}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="relative before:absolute before:inset-0 before:flex before:items-center before:pt-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {isPro ? (
            <button
              type="button"
              onClick={() => {
                if (!canCreatePelada) return;
                setShowModal(true);
              }}
              disabled={!canCreatePelada}
              className={[
                "w-full mt-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all duration-200 flex items-center justify-center gap-2",
                canCreatePelada
                  ? "bg-white text-black hover:bg-cyan-400 hover:shadow-cyan-500/20 active:scale-[0.99]"
                  : "bg-white/10 border border-white/10 text-white/40 cursor-not-allowed",
              ].join(" ")}
            >
              <span className="text-xl leading-none">+</span>
              {canCreatePelada ? "Nova pelada" : "Limite atingido"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="w-full mt-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-cyan-400 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {upgradeLoading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Fazer upgrade para criar peladas</>
              )}
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[9px] font-bold text-white/15 uppercase tracking-widest">
          FutScore · Ultimate Manager
        </p>
      </div>

      {showModal && (
        <CreatePeladaModal
          userId={user.id}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

