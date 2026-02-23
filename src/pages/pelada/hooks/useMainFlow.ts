import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Pelada, Player, TeamDraw } from "@/shared/types";
import { drawTeams, encodeSharePayload, generateId, recalcOverall } from "@/shared/utils";

type MainFlowTab = "dashboard" | "players" | "events" | "draw";

const PLAYERS_STORAGE_KEY = (peladaId: string) => `pelada_players_${peladaId}`;

interface MainFlowState {
  peladaId: string | null;
  players: Player[];
  activeTab: MainFlowTab;
  selectedPlayer: Player | null;
  currentDraw: TeamDraw | null;
  showDeleteConfirm: boolean;
  searchQuery: string;
  shareCopied: boolean;
}

type MainFlowAction =
  | { type: "INIT"; peladaId: string; players: Player[] }
  | { type: "SET_ACTIVE_TAB"; tab: MainFlowTab }
  | { type: "SET_SELECTED_PLAYER"; player: Player | null }
  | { type: "SET_CURRENT_DRAW"; draw: TeamDraw | null }
  | { type: "SET_SHOW_DELETE_CONFIRM"; value: boolean }
  | { type: "SET_SEARCH_QUERY"; value: string }
  | { type: "SET_SHARE_COPIED"; value: boolean }
  | { type: "SET_PLAYERS"; updater: Player[] | ((prev: Player[]) => Player[]) }
  | {
      type: "UPDATE_SELECTED_PLAYER";
      updater: (current: Player) => Player;
      recalc?: boolean;
    };

const initialState: MainFlowState = {
  peladaId: null,
  players: [],
  activeTab: "dashboard",
  selectedPlayer: null,
  currentDraw: null,
  showDeleteConfirm: false,
  searchQuery: "",
  shareCopied: false,
};

function reducer(state: MainFlowState, action: MainFlowAction): MainFlowState {
  switch (action.type) {
    case "INIT":
      return {
        peladaId: action.peladaId,
        players: action.players,
        activeTab: "dashboard",
        selectedPlayer: null,
        currentDraw: null,
        showDeleteConfirm: false,
        searchQuery: "",
        shareCopied: false,
      };
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
      const final = action.recalc ? { ...next, overall: recalcOverall(next) } : next;
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

export function useMainFlow(params: { pelada: Pelada; isAdmin: boolean }) {
  const { pelada, isAdmin } = params;

  const [state, dispatch] = useReducer(reducer, initialState);

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

  const setPlayers = useCallback(
    (updater: Player[] | ((prev: Player[]) => Player[])) => {
      dispatch({ type: "SET_PLAYERS", updater });
    },
    [],
  );

  useEffect(() => {
    if (state.peladaId !== pelada.id) {
      const saved = localStorage.getItem(PLAYERS_STORAGE_KEY(pelada.id));
      const players = saved ? (JSON.parse(saved) as Player[]) : [];
      dispatch({ type: "INIT", peladaId: pelada.id, players });
    }
  }, [pelada.id, state.peladaId]);

  useEffect(() => {
    if (state.peladaId !== pelada.id) return;
    localStorage.setItem(
      PLAYERS_STORAGE_KEY(pelada.id),
      JSON.stringify(state.players),
    );
  }, [pelada.id, state.peladaId, state.players]);

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

  const handleShare = () => {
    const payload = {
      n: pelada.name,
      p: state.players,
      d: state.currentDraw,
      t: Date.now(),
    };
    const encoded = encodeSharePayload(payload);
    const url = `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}/view#${encoded}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      },
      () => alert("Não foi possível copiar o link."),
    );
  };

  const handleAddPlayer = () => {
    if (!isAdmin) return;
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
      attributes: {
        pace: 70,
        shooting: 70,
        passing: 70,
        dribbling: 70,
        defending: 70,
        physical: 70,
      },
      overall: 70,
    };
    newPlayer.overall = recalcOverall(newPlayer);
    setCurrentDraw(null);
    setPlayers((prev) => [...prev, newPlayer]);
    setSelectedPlayer(newPlayer);
  };

  const handleDraw = () => {
    if (state.players.length < 2) {
      alert("Adicione pelo menos 2 jogadores.");
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
        updatedPlayer.overall = recalcOverall(updatedPlayer);
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
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== state.selectedPlayer!.id) return p;
          const updated = { ...p, photoUrl: base64String };
          setSelectedPlayer(updated);
          return updated;
        }),
      );
    };
    reader.readAsDataURL(file);
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

  const executeRemovePlayer = () => {
    if (!isAdmin) return;
    if (!state.selectedPlayer) return;
    const idToRemove = state.selectedPlayer.id;
    setPlayers((prev) => prev.filter((p) => p.id !== idToRemove));
    setCurrentDraw(null);
    setSelectedPlayer(null);
    setShowDeleteConfirm(false);
  };

  const updateSelectedPlayer = (
    updater: (current: Player) => Player,
    options?: { recalcOverall?: boolean },
  ) => {
    if (!isAdmin) return;
    dispatch({
      type: "UPDATE_SELECTED_PLAYER",
      updater,
      recalc: options?.recalcOverall,
    });
  };

  return {
    players: state.players,
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
    topPlayers,
    filteredPlayers,
    avgOverall,
    handleShare,
    handleAddPlayer,
    handleDraw,
    updatePlayerAttribute,
    handlePhotoUpload,
    handlePhotoLink,
    executeRemovePlayer,
    updateSelectedPlayer,
  };
}

