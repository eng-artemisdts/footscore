import { supabase } from "@/shared/supabase";

export async function joinPelada(peladaId: string, userId: string) {
  if (!supabase) throw new Error("Servidor indisponível.");
  const cleanedPeladaId = (peladaId ?? "").trim();
  const cleanedUserId = (userId ?? "").trim();
  if (!cleanedPeladaId || !cleanedUserId) throw new Error("Dados inválidos para entrar na pelada.");

  const ensureAuthedUserId = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) return userData.user.id;

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) return sessionData.session.user.id;

    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.user?.id) return refreshData.session.user.id;

    return null;
  };

  const authedUserId = await ensureAuthedUserId();
  if (!authedUserId) throw new Error("Sessão expirada. Faça login novamente.");
  if (authedUserId !== cleanedUserId) throw new Error("Sessão inválida. Faça login novamente.");

  const { error } = await supabase.from("pelada_members").insert({
    pelada_id: cleanedPeladaId,
    user_id: cleanedUserId,
  });

  if (error) {
    const msg = error.message || "Não foi possível entrar na pelada.";
    const details = [error.code, error.details, error.hint].filter(Boolean).join(" · ");

    if (error.code === "23505" || /duplicate key/i.test(msg)) return;

    if (/row-level security/i.test(msg) || /violates row-level security/i.test(msg)) {
      throw new Error(
        `Permissão negada pelo RLS ao entrar na pelada. Verifique a policy de INSERT em public.pelada_members (with check) e se a requisição está indo autenticada. ${details ? `(${details})` : ""}`.trim(),
      );
    }

    throw new Error(details ? `${msg} (${details})` : msg);
  }
}

