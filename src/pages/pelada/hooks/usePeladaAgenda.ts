import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeladaEvent, PeladaEventConfirmation, PeladaMemberPaymentStatus } from "@/shared/types";
import { supabase } from "@/shared/supabase";
import { useToast } from "@/shared/ui/ToastProvider";

type PeladaEventRow = {
  id: string;
  pelada_id: string;
  starts_at: string;
  location: string;
  min_people: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type PeladaEventConfirmationRow = {
  pelada_event_id: string;
  user_id: string;
  status: "CONFIRMED" | "CANCELLED";
  created_at: string;
  updated_at: string;
};

type PeladaMemberRow = {
  payment_status: PeladaMemberPaymentStatus;
};

type PeladaUserNameRow = {
  user_id: string;
  name: string | null;
};

function rowToEvent(row: PeladaEventRow): PeladaEvent {
  return {
    id: row.id,
    peladaId: row.pelada_id,
    startsAt: row.starts_at,
    location: row.location,
    minPeople: row.min_people,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToConfirmation(row: PeladaEventConfirmationRow): PeladaEventConfirmation {
  return {
    peladaEventId: row.pelada_event_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type SeenStateV1 = {
  seenEventIds: string[];
  lastConfirmedCountByEventId: Record<string, number>;
  quorumWarnedAtByEventId: Record<string, number>;
};

const seenKey = (peladaId: string) => `pelada_agenda_seen_v1_${peladaId}`;

function loadSeen(peladaId: string): SeenStateV1 {
  try {
    const raw = localStorage.getItem(seenKey(peladaId));
    if (!raw) return { seenEventIds: [], lastConfirmedCountByEventId: {}, quorumWarnedAtByEventId: {} };
    const parsed = JSON.parse(raw) as Partial<SeenStateV1>;
    return {
      seenEventIds: Array.isArray(parsed.seenEventIds) ? parsed.seenEventIds.filter((x) => typeof x === "string") : [],
      lastConfirmedCountByEventId: parsed.lastConfirmedCountByEventId && typeof parsed.lastConfirmedCountByEventId === "object" ? parsed.lastConfirmedCountByEventId as Record<string, number> : {},
      quorumWarnedAtByEventId: parsed.quorumWarnedAtByEventId && typeof parsed.quorumWarnedAtByEventId === "object" ? parsed.quorumWarnedAtByEventId as Record<string, number> : {},
    };
  } catch {
    return { seenEventIds: [], lastConfirmedCountByEventId: {}, quorumWarnedAtByEventId: {} };
  }
}

function saveSeen(peladaId: string, next: SeenStateV1) {
  try {
    localStorage.setItem(seenKey(peladaId), JSON.stringify(next));
  } catch {}
}

export function usePeladaAgenda(params: { peladaId: string | null; userId: string | null; isAdmin: boolean }) {
  const { peladaId, userId, isAdmin } = params;
  const toast = useToast();

  const [events, setEvents] = useState<PeladaEvent[]>([]);
  const [confirmations, setConfirmations] = useState<PeladaEventConfirmation[]>([]);
  const [userNameByUserId, setUserNameByUserId] = useState<Map<string, string>>(new Map());
  const [paymentStatus, setPaymentStatus] = useState<PeladaMemberPaymentStatus>("REGULAR");
  const [loading, setLoading] = useState<boolean>(!!supabase);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const confirmationsByEventId = useMemo(() => {
    const map = new Map<string, PeladaEventConfirmation[]>();
    for (const c of confirmations) {
      const arr = map.get(c.peladaEventId) ?? [];
      arr.push(c);
      map.set(c.peladaEventId, arr);
    }
    return map;
  }, [confirmations]);

  const myConfirmationByEventId = useMemo(() => {
    if (!userId) return new Map<string, PeladaEventConfirmation>();
    const map = new Map<string, PeladaEventConfirmation>();
    for (const c of confirmations) {
      if (c.userId === userId) map.set(c.peladaEventId, c);
    }
    return map;
  }, [confirmations, userId]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setEvents([]);
      setConfirmations([]);
      setError("Servidor indisponível.");
      return;
    }
    if (!peladaId || !userId) {
      setLoading(false);
      setEvents([]);
      setConfirmations([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("pelada_events")
        .select("id,pelada_id,starts_at,location,min_people,created_by,created_at,updated_at")
        .eq("pelada_id", peladaId)
        .gte("starts_at", new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString())
        .order("starts_at", { ascending: true });
      if (eventsError) throw new Error(eventsError.message || "Falha ao carregar agenda.");
      const nextEvents = (eventsData as unknown as PeladaEventRow[] | null)?.map(rowToEvent) ?? [];

      const { data: memberData, error: memberError } = await supabase
        .from("pelada_members")
        .select("payment_status")
        .eq("pelada_id", peladaId)
        .eq("user_id", userId)
        .maybeSingle();
      if (memberError) throw new Error(memberError.message || "Falha ao carregar permissões.");
      const nextPayment = ((memberData as unknown as PeladaMemberRow | null)?.payment_status ?? "REGULAR") as PeladaMemberPaymentStatus;

      let nextConfirmations: PeladaEventConfirmation[] = [];
      const ids = nextEvents.map((e) => e.id);
      if (ids.length) {
        const { data: confData, error: confError } = await supabase
          .from("pelada_event_confirmations")
          .select("pelada_event_id,user_id,status,created_at,updated_at")
          .in("pelada_event_id", ids);
        if (confError) throw new Error(confError.message || "Falha ao carregar confirmações.");
        nextConfirmations = (confData as unknown as PeladaEventConfirmationRow[] | null)?.map(rowToConfirmation) ?? [];
      }

      let nextUserNameByUserId = new Map<string, string>();
      const uniqueUserIds = Array.from(new Set(nextConfirmations.map((c) => c.userId))).filter(Boolean);
      if (uniqueUserIds.length) {
        const { data: namesData, error: namesError } = await supabase
          .rpc("get_pelada_user_names", {
            _pelada_id: peladaId,
            _user_ids: uniqueUserIds,
          });
        if (namesError) throw new Error(namesError.message || "Falha ao carregar nomes.");
        const rows = (namesData as unknown as PeladaUserNameRow[] | null) ?? [];
        for (const r of rows) {
          const id = typeof r?.user_id === "string" ? r.user_id : "";
          const nm = typeof r?.name === "string" ? r.name : "";
          if (id && nm) nextUserNameByUserId.set(id, nm);
        }
      }

      if (!mountedRef.current) return;
      setEvents(nextEvents);
      setConfirmations(nextConfirmations);
      setUserNameByUserId(nextUserNameByUserId);
      setPaymentStatus(nextPayment);

      const seen = loadSeen(peladaId);
      const seenEventIds = new Set(seen.seenEventIds);
      const now = Date.now();

      for (const e of nextEvents) {
        if (!seenEventIds.has(e.id)) {
          toast.info(`Novo agendamento em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(e.startsAt))}`, { title: "Agenda atualizada" });
          seenEventIds.add(e.id);
        }
      }

      const nextSeen: SeenStateV1 = {
        seenEventIds: Array.from(seenEventIds),
        lastConfirmedCountByEventId: { ...seen.lastConfirmedCountByEventId },
        quorumWarnedAtByEventId: { ...seen.quorumWarnedAtByEventId },
      };

      const countConfirmed = (eventId: string) =>
        nextConfirmations.filter((c) => c.peladaEventId === eventId && c.status === "CONFIRMED").length;

      if (isAdmin) {
        for (const e of nextEvents) {
          const confirmed = countConfirmed(e.id);
          const prev = Number(nextSeen.lastConfirmedCountByEventId[e.id] ?? 0);
          if (Number.isFinite(prev) && confirmed > prev) {
            toast.info(`+${confirmed - prev} confirmação(ões)`, { title: "Novas confirmações" });
          }
          nextSeen.lastConfirmedCountByEventId[e.id] = confirmed;
        }
      }

      for (const e of nextEvents) {
        const startsInMs = new Date(e.startsAt).getTime() - now;
        if (!Number.isFinite(startsInMs)) continue;
        if (startsInMs < 0 || startsInMs > 1000 * 60 * 60 * 24) continue;

        const confirmed = countConfirmed(e.id);
        if (confirmed >= e.minPeople) continue;

        const lastWarnAt = Number(nextSeen.quorumWarnedAtByEventId[e.id] ?? 0);
        const tooSoon = lastWarnAt && now - lastWarnAt < 1000 * 60 * 60;
        if (!tooSoon) {
          toast.warning(`Quórum baixo: ${confirmed}/${e.minPeople}`, { title: "Atenção" });
          nextSeen.quorumWarnedAtByEventId[e.id] = now;
        }
      }

      saveSeen(peladaId, nextSeen);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Falha ao carregar agenda.");
      setEvents([]);
      setConfirmations([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isAdmin, peladaId, toast, userId]);

  useEffect(() => {
    setEvents([]);
    setConfirmations([]);
    setError(null);
  }, [peladaId, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    if (!peladaId || !userId) return;
    const id = window.setInterval(() => {
      void refresh();
    }, 45000);
    return () => window.clearInterval(id);
  }, [peladaId, refresh, userId]);

  const createEvent = useCallback(
    async (input: { id: string; startsAt: string; location: string; minPeople: number }) => {
      if (!supabase) throw new Error("Servidor indisponível.");
      if (!peladaId || !userId) throw new Error("Sessão inválida.");
      const { error } = await supabase.from("pelada_events").insert({
        id: input.id,
        pelada_id: peladaId,
        starts_at: input.startsAt,
        location: input.location,
        min_people: input.minPeople,
        created_by: userId,
      });
      if (error) throw new Error(error.message || "Não foi possível agendar.");
      await refresh();
    },
    [peladaId, refresh, userId],
  );

  const updateEvent = useCallback(
    async (input: { id: string; startsAt: string; location: string; minPeople: number }) => {
      if (!supabase) throw new Error("Servidor indisponível.");
      if (!peladaId || !userId) throw new Error("Sessão inválida.");
      if (!isAdmin) throw new Error("Sem permissão para editar.");
      const { error } = await supabase
        .from("pelada_events")
        .update({
          starts_at: input.startsAt,
          location: input.location,
          min_people: input.minPeople,
        })
        .eq("id", input.id)
        .eq("pelada_id", peladaId);
      if (error) throw new Error(error.message || "Não foi possível atualizar.");
      await refresh();
    },
    [isAdmin, peladaId, refresh, userId],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!supabase) throw new Error("Servidor indisponível.");
      if (!peladaId || !userId) throw new Error("Sessão inválida.");
      if (!isAdmin) throw new Error("Sem permissão para remover.");
      const { error } = await supabase
        .from("pelada_events")
        .delete()
        .eq("id", eventId)
        .eq("pelada_id", peladaId);
      if (error) throw new Error(error.message || "Não foi possível remover.");
      await refresh();
    },
    [isAdmin, peladaId, refresh, userId],
  );

  const setMyConfirmation = useCallback(
    async (input: { peladaEventId: string; status: "CONFIRMED" | "CANCELLED" }) => {
      if (!supabase) throw new Error("Servidor indisponível.");
      if (!userId) throw new Error("Sessão inválida.");
      const { error } = await supabase.from("pelada_event_confirmations").upsert(
        {
          pelada_event_id: input.peladaEventId,
          user_id: userId,
          status: input.status,
        },
        { onConflict: "pelada_event_id,user_id" },
      );
      if (error) throw new Error(error.message || "Não foi possível atualizar confirmação.");
      await refresh();
    },
    [refresh, userId],
  );

  return {
    events,
    confirmations,
    confirmationsByEventId,
    myConfirmationByEventId,
    userNameByUserId,
    paymentStatus,
    loading,
    error,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    setMyConfirmation,
  };
}

