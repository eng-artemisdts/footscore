import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Pelada, PeladaSport, Player, Position, TeamDraw } from "@/shared/types";
import { drawTeams, encodeSharePayload, generateId, recalcOverall } from "@/shared/utils";
import { supabase } from "@/shared/supabase";
import { env } from "@/shared/env";
import { shortenUrl } from "@/modules/share/shortio";
import { coerceAttributesForSport, getSportSchema } from "@/shared/sportSchemas";
import { useToast } from "@/shared/ui/ToastProvider";
import { uploadPlayerPhoto } from "@/modules/peladas/uploadPlayerPhoto";
import { deletePlayerPhoto } from "@/modules/peladas/deletePlayerPhoto";

type MainFlowTab = "dashboard" | "players" | "events" | "draw";

const PLAYERS_STORAGE_KEY = (peladaId: string) => `pelada_players_${peladaId}`;

type PeladaPlayerRow = {
  pelada_id: string;
  id: string;
  user_id: string | null;
  display_name: string;
  nick: string;
  photo_url: string | null;
  primary_position: string;
  secondary_position: string | null;
  dominant_foot: Player["dominantFoot"];
  presence_count: number;
  attributes: Player["attributes"];
  overall: number;
  created_at?: string;
  updated_at?: string;
};

interface MainFlowState {
  peladaId: string | null;
  players: Player[];
  playersLoading: boolean;
  activeTab: MainFlowTab;
  selectedPlayer: Player | null;
  currentDraw: TeamDraw | null;
  showDeleteConfirm: boolean;
  searchQuery: string;
  shareCopied: boolean;
  shareLoading: boolean;
}

type MainFlowAction =
  | { type: "INIT"; peladaId: string; players: Player[] }
  | { type: "SET_PLAYERS_LOADING"; value: boolean }
  | { type: "SET_ACTIVE_TAB"; tab: MainFlowTab }
  | { type: "SET_SELECTED_PLAYER"; player: Player | null }
  | { type: "SET_CURRENT_DRAW"; draw: TeamDraw | null }
  | { type: "SET_SHOW_DELETE_CONFIRM"; value: boolean }
  | { type: "SET_SEARCH_QUERY"; value: string }
  | { type: "SET_SHARE_COPIED"; value: boolean }
  | { type: "SET_SHARE_LOADING"; value: boolean }
  | { type: "SET_PLAYERS"; updater: Player[] | ((prev: Player[]) => Player[]) }
  | {
      type: "UPDATE_SELECTED_PLAYER";
      updater: (current: Player) => Player;
      recalc?: boolean;
      sport?: PeladaSport;
    };

const initialState: MainFlowState = {
  peladaId: null,
  players: [],
  playersLoading: false,
  activeTab: "dashboard",
  selectedPlayer: null,
  currentDraw: null,
  showDeleteConfirm: false,
  searchQuery: "",
  shareCopied: false,
  shareLoading: false,
};

function reducer(state: MainFlowState, action: MainFlowAction): MainFlowState {
  switch (action.type) {
    case "INIT":
      return {
        peladaId: action.peladaId,
        players: action.players,
        playersLoading: false,
        activeTab: "dashboard",
        selectedPlayer: null,
        currentDraw: null,
        showDeleteConfirm: false,
        searchQuery: "",
        shareCopied: false,
        shareLoading: false,
      };
    case "SET_PLAYERS_LOADING":
      return { ...state, playersLoading: action.value };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_SELECTED_PLAYER":
      return { ...state, selectedPlayer: action.player };
    case "SET_CURRENT_DRAW":
      return { ...state, currentDraw: action.draw };
    case "SET_SHOW_DELETE_CONFIRM":
      return { ...state, showDeleteConfirm: action.value };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.value };
    case "SET_SHARE_COPIED":
      return { ...state, shareCopied: action.value };
    case "SET_SHARE_LOADING":
      return { ...state, shareLoading: action.value };
    case "SET_PLAYERS": {
      const next =
        typeof action.updater === "function"
          ? (action.updater as (prev: Player[]) => Player[])(state.players)
          : action.updater;
      return { ...state, players: next };
    }
    case "UPDATE_SELECTED_PLAYER": {
      if (!state.selectedPlayer) return state;
      const next = action.updater(state.selectedPlayer);
      const final =
        action.recalc && action.sport
          ? { ...next, overall: recalcOverall(next, action.sport) }
          : next;
      return {
        ...state,
        selectedPlayer: final,
        players: state.players.map((p) => (p.id === final.id ? final : p)),
      };
    }
    default:
      return state;
  }
}

export function useMainFlow(params: { pelada: Pelada | null; isAdmin: boolean }) {
  const { pelada, isAdmin } = params;
  const toast = useToast();

  const [state, dispatch] = useReducer(reducer, initialState);

  const loadLocalPlayers = useCallback((peladaId: string): Player[] => {
    try {
      const saved = localStorage.getItem(PLAYERS_STORAGE_KEY(peladaId));
      return saved ? (JSON.parse(saved) as Player[]) : [];
    } catch {
      return [];
    }
  }, []);

  const rowToPlayer = useCallback((row: PeladaPlayerRow): Player => {
    const primary = (row.primary_position as Position) ?? "MEI";
    const secondary = (row.secondary_position as Position | null) ?? null;
    const attributes = coerceAttributesForSport(pelada?.sport, row.attributes);
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      nick: row.nick,
      photoUrl: row.photo_url,
      primaryPosition: primary,
      secondaryPosition: secondary,
      dominantFoot: row.dominant_foot,
      presenceCount: row.presence_count ?? 0,
      attributes,
      overall:
        typeof row.overall === "number"
          ? row.overall
          : recalcOverall(
              { ...(row as any), attributes, primaryPosition: primary, secondaryPosition: secondary },
              pelada?.sport ?? "FUTEBOL",
            ),
    };
  }, [pelada?.sport]);

  const playerToRow = useCallback(
    (peladaId: string, player: Player): PeladaPlayerRow => {
      return {
        pelada_id: peladaId,
        id: player.id,
        user_id: player.userId,
        display_name: player.displayName,
        nick: player.nick,
        photo_url: player.photoUrl,
        primary_position: player.primaryPosition,
        secondary_position: player.secondaryPosition,
        dominant_foot: player.dominantFoot,
        presence_count: player.presenceCount ?? 0,
        attributes: coerceAttributesForSport(pelada?.sport, player.attributes),
        overall: player.overall,
        updated_at: new Date().toISOString(),
      };
    },
    [pelada?.sport],
  );

  const upsertPlayersToRemote = useCallback(
    async (peladaId: string, players: Player[]) => {
      if (!supabase) return;
      if (!players.length) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const rows = players.map((p) => playerToRow(peladaId, p));
      await supabase.from("pelada_players").upsert(rows as any, { onConflict: "pelada_id,id" });
    },
    [playerToRow],
  );

  const upsertPlayerToRemote = useCallback(
    async (peladaId: string, player: Player) => {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Sessão expirada. Saia e entre novamente.");
      const row = playerToRow(peladaId, player);
      const { error } = await supabase
        .from("pelada_players")
        .upsert(row as any, { onConflict: "pelada_id,id" });
      if (error) throw new Error(error.message || "Não foi possível salvar o jogador.");
    },
    [playerToRow],
  );

  const deletePlayerFromRemote = useCallback(async (peladaId: string, playerId: string) => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Sessão expirada. Saia e entre novamente.");

    const { error } = await supabase
      .from("pelada_players")
      .delete()
      .eq("pelada_id", peladaId)
      .eq("id", playerId);
    if (error) throw new Error(error.message || "Não foi possível excluir o jogador.");
  }, []);

  const setActiveTab = useCallback((tab: MainFlowTab) => {
    dispatch({ type: "SET_ACTIVE_TAB", tab });
  }, []);

  const setSelectedPlayer = useCallback((player: Player | null) => {
    dispatch({ type: "SET_SELECTED_PLAYER", player });
  }, []);

  const setCurrentDraw = useCallback((draw: TeamDraw | null) => {
    dispatch({ type: "SET_CURRENT_DRAW", draw });
  }, []);

  const setShowDeleteConfirm = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHOW_DELETE_CONFIRM", value });
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", value });
  }, []);

  const setShareCopied = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHARE_COPIED", value });
  }, []);

  const setShareLoading = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHARE_LOADING", value });
  }, []);

  const setPlayers = useCallback(
    (updater: Player[] | ((prev: Player[]) => Player[])) => {
      dispatch({ type: "SET_PLAYERS", updater });
    },
    [],
  );

  useEffect(() => {
    if (!pelada) return;
    if (state.peladaId === pelada.id) return;

    dispatch({ type: "SET_PLAYERS_LOADING", value: true });

    let cancelled = false;
    const sport = pelada.sport;
    const localPlayers = loadLocalPlayers(pelada.id).map((p) => {
      const attributes = coerceAttributesForSport(sport, p.attributes);
      const next = { ...p, attributes };
      return { ...next, overall: recalcOverall(next, sport) };
    });

    const initLocal = () => {
      if (cancelled) return;
      dispatch({ type: "INIT", peladaId: pelada.id, players: localPlayers });
      if (isAdmin && localPlayers.length) {
        void upsertPlayersToRemote(pelada.id, localPlayers);
      }
    };

    if (!supabase) {
      initLocal();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user?.id) {
        initLocal();
        return;
      }

      const { data, error } = await supabase
        .from("pelada_players")
        .select(
          "pelada_id,id,user_id,display_name,nick,photo_url,primary_position,secondary_position,dominant_foot,presence_count,attributes,overall,created_at,updated_at",
        )
        .eq("pelada_id", pelada.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error || !data) {
        initLocal();
        return;
      }

      const remotePlayers = (data as unknown as PeladaPlayerRow[]).map(rowToPlayer);
      if (remotePlayers.length) {
        dispatch({ type: "INIT", peladaId: pelada.id, players: remotePlayers });
        return;
      }

      initLocal();
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, loadLocalPlayers, pelada, rowToPlayer, state.peladaId, upsertPlayersToRemote]);

  useEffect(() => {
    if (!pelada) return;
    if (state.peladaId !== pelada.id) return;
    localStorage.setItem(PLAYERS_STORAGE_KEY(pelada.id), JSON.stringify(state.players));
  }, [pelada, state.peladaId, state.players]);

  const topPlayers = useMemo(() => {
    return [...state.players].sort((a, b) => b.overall - a.overall).slice(0, 5);
  }, [state.players]);

  const filteredPlayers = useMemo(() => {
    const q = state.searchQuery.toLowerCase();
    return state.players
      .filter(
        (p) =>
          p.nick.toLowerCase().includes(q) ||
          p.primaryPosition.toLowerCase().includes(q),
      )
      .sort((a, b) => b.overall - a.overall);
  }, [state.players, state.searchQuery]);

  const avgOverall = useMemo(() => {
    return state.players.length
      ? Math.round(
          state.players.reduce((acc, p) => acc + p.overall, 0) /
            state.players.length,
        )
      : 0;
  }, [state.players]);

  const playersLoading = useMemo(() => {
    if (!pelada) return false;
    return state.playersLoading || state.peladaId !== pelada.id;
  }, [pelada, state.peladaId, state.playersLoading]);

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
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

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

  const handleShare = async () => {
    if (!pelada) return;
    if (state.shareLoading) return;
    const payload = {
      i: pelada.id,
      n: pelada.name,
      p: state.players,
      d: state.currentDraw,
      t: Date.now(),
    };
    const encoded = encodeSharePayload(payload);
    const longUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}/view#${encoded}`;

    let finalUrl = longUrl;
    const cacheKey = `pelada_share_short_${pelada.id}`;
    const cached = localStorage.getItem(cacheKey)?.trim() ?? "";
    if (cached) {
      finalUrl = cached;
    } else {
      setShareLoading(true);
      try {
        const token = await getAccessToken();
        if (token) {
          const short = await shortenUrl(longUrl, token);
          if (short) {
            finalUrl = short;
            localStorage.setItem(cacheKey, short);
          }
        }
      } catch {
      } finally {
        setShareLoading(false);
      }
    }

    try {
      await navigator.clipboard.writeText(finalUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar o link.", { title: "Cópia falhou" });
    }
  };

  const handleAddPlayer = () => {
    if (!isAdmin) return;
    if (!pelada) return;
    const schema = getSportSchema(pelada.sport);
    const newPlayer: Player = {
      id: generateId(),
      userId: null,
      displayName: "Novo Jogador",
      nick: "CRAQUE " + (state.players.length + 1),
      photoUrl: null,
      primaryPosition: "MEI",
      secondaryPosition: null,
      dominantFoot: "DIREITO",
      presenceCount: 0,
      attributes: { ...schema.defaultAttributes },
      overall: 0,
    };
    newPlayer.overall = recalcOverall(newPlayer, pelada.sport);
    setCurrentDraw(null);
    setPlayers((prev) => [...prev, newPlayer]);
    setSelectedPlayer(newPlayer);

    void (async () => {
      try {
        await upsertPlayerToRemote(pelada.id, newPlayer);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar o jogador.", {
          title: "Falha ao salvar",
        });
      }
    })();
  };

  const handleDraw = () => {
    if (state.players.length < 2) {
      toast.warning("Adicione pelo menos 2 jogadores.", { title: "Jogadores insuficientes" });
      return;
    }
    const draw = drawTeams(state.players, 2, "event-" + Date.now());
    setCurrentDraw(draw);
    setActiveTab("draw");
  };

  const updatePlayerAttribute = (
    playerId: string,
    attr: string,
    value: number,
  ) => {
    if (!isAdmin) return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        const updatedAttrs = { ...p.attributes, [attr]: value } as Player["attributes"];
        const updatedPlayer = { ...p, attributes: updatedAttrs };
        updatedPlayer.overall = recalcOverall(updatedPlayer, pelada?.sport ?? "FUTEBOL");
        if (state.selectedPlayer?.id === playerId) {
          setSelectedPlayer(updatedPlayer);
        }
        return updatedPlayer;
      }),
    );
  };

  const handlePhotoUpload = (file: File | null | undefined) => {
    if (!isAdmin) return;
    if (!file || !state.selectedPlayer) return;
    if (!pelada) return;

    const current = state.selectedPlayer;

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          toast.error("Sessão expirada. Saia e entre novamente.", { title: "Falha no upload" });
          return;
        }

        const url = await uploadPlayerPhoto({
          peladaId: pelada.id,
          playerId: current.id,
          file,
          accessToken: token,
        });

        const updated = { ...current, photoUrl: url };
        setSelectedPlayer(updated);
        setPlayers((prev) => prev.map((p) => (p.id === current.id ? updated : p)));

        await upsertPlayerToRemote(pelada.id, updated);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível fazer upload da foto.", { title: "Falha no upload" });
      }
    })();
  };

  const handlePhotoLink = (url: string) => {
    if (!isAdmin) return;
    if (!state.selectedPlayer || !url) return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== state.selectedPlayer!.id) return p;
        const updated = { ...p, photoUrl: url };
        setSelectedPlayer(updated);
        return updated;
      }),
    );
  };

  const handleRemovePhoto = () => {
    if (!isAdmin) return;
    if (!state.selectedPlayer) return;
    if (!pelada) return;
    if (!state.selectedPlayer.photoUrl) return;

    const current = state.selectedPlayer;
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          toast.error("Sessão expirada. Saia e entre novamente.", { title: "Falha ao remover" });
          return;
        }

        await deletePlayerPhoto({ peladaId: pelada.id, playerId: current.id, accessToken: token });
        const updated = { ...current, photoUrl: null };
        setSelectedPlayer(updated);
        setPlayers((prev) => prev.map((p) => (p.id === current.id ? updated : p)));
        await upsertPlayerToRemote(pelada.id, updated);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível remover a foto.", { title: "Falha ao remover" });
      }
    })();
  };

  const executeRemovePlayer = () => {
    if (!isAdmin) return;
    if (!state.selectedPlayer) return;
    if (!pelada) return;
    const idToRemove = state.selectedPlayer.id;
    setPlayers((prev) => prev.filter((p) => p.id !== idToRemove));
    setCurrentDraw(null);
    setSelectedPlayer(null);
    setShowDeleteConfirm(false);

    void (async () => {
      try {
        await deletePlayerFromRemote(pelada.id, idToRemove);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível excluir o jogador.", {
          title: "Falha ao excluir",
        });
      }
    })();
  };

  const closeSelectedPlayer = useCallback(async () => {
    if (!pelada) return;
    if (!state.selectedPlayer) return;

    const current = state.selectedPlayer;
    setSelectedPlayer(null);
    setShowDeleteConfirm(false);

    if (!isAdmin) return;
    try {
      await upsertPlayerToRemote(pelada.id, current);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o jogador.", {
        title: "Falha ao salvar",
      });
    }
  }, [isAdmin, pelada, state.selectedPlayer, toast, upsertPlayerToRemote, setSelectedPlayer, setShowDeleteConfirm]);

  const updateSelectedPlayer = (
    updater: (current: Player) => Player,
    options?: { recalcOverall?: boolean },
  ) => {
    if (!isAdmin) return;
    dispatch({
      type: "UPDATE_SELECTED_PLAYER",
      updater,
      recalc: options?.recalcOverall,
      sport: pelada?.sport ?? "FUTEBOL",
    });
  };

  return {
    players: state.players,
    playersLoading,
    setPlayers,
    activeTab: state.activeTab,
    setActiveTab,
    selectedPlayer: state.selectedPlayer,
    setSelectedPlayer,
    currentDraw: state.currentDraw,
    setCurrentDraw,
    showDeleteConfirm: state.showDeleteConfirm,
    setShowDeleteConfirm,
    searchQuery: state.searchQuery,
    setSearchQuery,
    shareCopied: state.shareCopied,
    shareLoading: state.shareLoading,
    topPlayers,
    filteredPlayers,
    avgOverall,
    handleShare,
    handleAddPlayer,
    handleDraw,
    updatePlayerAttribute,
    handlePhotoUpload,
    handlePhotoLink,
    handleRemovePhoto,
    executeRemovePlayer,
    closeSelectedPlayer,
    updateSelectedPlayer,
  };
}

