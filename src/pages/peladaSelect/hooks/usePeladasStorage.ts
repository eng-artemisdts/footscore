import { useEffect, useState } from "react";
import { Pelada } from "@/shared/types";
import { supabase } from "@/shared/supabase";

function normalizePelada(raw: Pelada): Pelada {
  return {
    ...raw,
    sport: raw?.sport ?? "FUTEBOL",
  };
}

async function fetchPeladasFromSupabase(): Promise<Pelada[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("peladas")
    .select("id,name,sport,admin_user_id,created_at")
    .order("created_at", { ascending: false });
  if (error) return null;
  if (!data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    sport: (row.sport as Pelada["sport"]) ?? "FUTEBOL",
    userId: row.admin_user_id as string,
    createdAt: row.created_at as string,
  }));
}

export async function savePelada(userId: string, pelada: Pelada): Promise<Pelada> {
  const nextPelada = normalizePelada(pelada);
  if (!supabase) return nextPelada;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Sessão expirada. Saia e entre novamente.");
  }

  const { data, error } = await supabase
    .from("peladas")
    .upsert(
      {
        id: nextPelada.id,
        name: nextPelada.name,
        sport: nextPelada.sport ?? "FUTEBOL",
        admin_user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id,name,sport,admin_user_id,created_at")
    .single();

  if (error || !data) return nextPelada;

  return normalizePelada({
    id: data.id as string,
    name: data.name as string,
    sport: (data.sport as Pelada["sport"]) ?? "FUTEBOL",
    userId: data.admin_user_id as string,
    createdAt: data.created_at as string,
  });
}

export function usePeladas(userId: string, refreshKey?: unknown) {
  const [peladas, setPeladasState] = useState<Pelada[]>([]);
  const [loading, setLoading] = useState<boolean>(!!supabase);

  useEffect(() => {
    setPeladasState([]);
  }, [userId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !userId) {
      setLoading(false);
      setPeladasState([]);
      return;
    }
    setLoading(true);
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user?.id) {
        setPeladasState([]);
        setLoading(false);
        return;
      }

      const remote = await fetchPeladasFromSupabase();
      if (cancelled || !remote) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setPeladasState(remote.map(normalizePelada));
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  return { peladas, loading };
}

