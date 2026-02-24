import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { POSITIONS, TRANSLATIONS } from '@/shared/constants';
import { peladaSlug } from '@/shared/utils';
import { PitchSVG } from '@/shared/ui/PitchSVG';
import { PlayerCard, PlayerCardSkeleton } from '@/shared/ui/PlayerCard';
import { RadarChart } from '@/shared/ui/RadarChart';
import { useAuthStore } from '@/modules/auth/authStore';
import { usePeladas } from '@/pages/peladaSelect/hooks/usePeladasStorage';
import { useMainFlow } from './hooks/useMainFlow';
import { getSportSchema } from '@/shared/sportSchemas';
import { DrawSetupStep } from './DrawSetupStep';
import { Player, Team, TeamDraw } from '@/shared/types';
import { AgendaTab } from './components/AgendaTab';
import { MatchTimer } from '@/shared/ui/MatchTimer';
import { MatchGoals } from '@/shared/ui/MatchGoals';

export const PeladaPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdminForPelada = useAuthStore((state) => state.isAdminForPelada);
  const { peladaSlug: slugParam } = useParams<{ peladaSlug: string }>();
  const { peladas, loading: peladasLoading } = usePeladas(user?.id ?? "", slugParam);

  const pelada = useMemo(() => {
    if (!slugParam) return null;
    for (const p of peladas) {
      const name = typeof (p as any)?.name === 'string' ? (p as any).name : '';
      if (!name) continue;
      let slug = '';
      try {
        slug = peladaSlug(name);
      } catch {
        slug = '';
      }
      if (slug === slugParam) return p;
    }
    return null;
  }, [peladas, slugParam]);

  const isAdmin = pelada?.userId ? isAdminForPelada(pelada.userId) : false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS['pt'] || TRANSLATIONS['en'];
  const sportSchema = getSportSchema(pelada?.sport);

  const {
    players,
    playersLoading,
    setPlayers,
    activeTab,
    setActiveTab,
    selectedPlayer,
    setSelectedPlayer,
    currentDraw,
    setCurrentDraw,
    drawHistory,
    saveCurrentDrawToHistory,
    removeDrawFromHistory,
    showDeleteConfirm,
    setShowDeleteConfirm,
    searchQuery,
    setSearchQuery,
    shareCopied,
    topPlayers,
    filteredPlayers,
    avgOverall,
    handleShare,
    shareLoading,
    handleAddPlayer,
    handleDraw,
    updatePlayerAttribute,
    handlePhotoUpload,
    handlePhotoLink,
    handleRemovePhoto,
    executeRemovePlayer,
    closeSelectedPlayer,
    updateSelectedPlayer,
  } = useMainFlow({ pelada, isAdmin });

  const [drawSetupOpen, setDrawSetupOpen] = useState(false);
  const [drawConfigReady, setDrawConfigReady] = useState(false);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [drawHistoryOpen, setDrawHistoryOpen] = useState(false);
  const [drawActionsOpen, setDrawActionsOpen] = useState(false);
  const dragRef = useRef<{ playerId: string; fromTeamIndex: number } | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  useEffect(() => {
    if (!pelada?.id) return;
    setDrawSetupOpen(false);
    setDrawConfigReady(false);
    setPresentIds([]);
    setEditingTeamId(null);
    setEditingTeamName('');
    setDrawActionsOpen(false);
  }, [pelada?.id]);

  const presentPlayers = useMemo(() => {
    if (!presentIds.length) return [];
    const set = new Set(presentIds);
    return players.filter((p) => set.has(p.id));
  }, [players, presentIds]);

  const effectivePresentIds = useMemo(() => {
    if (drawConfigReady && presentIds.length) return presentIds;
    const ids = currentDraw?.presentPlayerIds ?? [];
    return Array.isArray(ids) ? ids : [];
  }, [currentDraw?.presentPlayerIds, drawConfigReady, presentIds]);

  const effectivePresentPlayers = useMemo(() => {
    if (!effectivePresentIds.length) return [];
    const set = new Set(effectivePresentIds);
    return players.filter((p) => set.has(p.id));
  }, [effectivePresentIds, players]);

  const openDrawSetup = () => {
    setActiveTab('draw');
    setCurrentDraw(null);
    setDrawSetupOpen(true);
    setPresentIds(players.map((p) => p.id));
  };

  const openDrawSetupWithPlayerIds = (playerIds: string[]) => {
    const allowed = new Set(players.map((p) => p.id));
    const next = Array.from(new Set(playerIds)).filter((id) => allowed.has(id));
    if (next.length < 2) return;
    setActiveTab('draw');
    setCurrentDraw(null);
    setPresentIds(next);
    setDrawSetupOpen(true);
  };

  const runDraw = () => {
    const ids = effectivePresentIds;
    const base = ids.length ? effectivePresentPlayers : players;
    handleDraw({
      players: base,
      presentPlayerIds: ids.length ? ids : null,
    });
  };

  const startEditingTeam = (teamId: string) => {
    if (!currentDraw) return;
    const team = currentDraw.teams.find((t) => t.id === teamId);
    if (!team) return;
    setEditingTeamId(teamId);
    setEditingTeamName(team.name);
  };

  const commitTeamName = () => {
    if (!currentDraw) return;
    if (!editingTeamId) return;
    const nextName = editingTeamName.trim();
    if (!nextName) {
      setEditingTeamId(null);
      setEditingTeamName('');
      return;
    }

    const teams = currentDraw.teams.map((t) => (t.id === editingTeamId ? { ...t, name: nextName } : t));
    setCurrentDraw({ ...currentDraw, teams });
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const cancelTeamNameEdit = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const recomputeTeam = (team: Team): Team => {
    const totalOverall = team.players.reduce((acc, p) => acc + p.overall, 0);
    const avgOverall = team.players.length ? Math.round(totalOverall / team.players.length) : 0;
    return { ...team, totalOverall, avgOverall };
  };

  const recomputeDraw = (draw: TeamDraw): TeamDraw => {
    const teams = draw.teams.map(recomputeTeam);
    const totals = teams.map((t) => t.totalOverall);
    const maxOvr = totals.length ? Math.max(...totals) : 0;
    const minOvr = totals.length ? Math.min(...totals) : 0;
    const diff = maxOvr - minOvr;
    const balanceScore = Math.max(0, 100 - diff * 2);
    const gkCount = teams
      .flatMap((t) => t.players)
      .filter((p) => p.primaryPosition === 'GOL').length;
    const gkCoverage = gkCount >= teams.length;

    return { ...draw, teams, diff, balanceScore, gkCoverage };
  };

  const movePlayer = (payload: {
    playerId: string;
    fromTeamIndex: number;
    toTeamIndex: number;
    toIndex: number;
  }) => {
    if (!currentDraw) return;
    const { playerId, fromTeamIndex, toTeamIndex, toIndex } = payload;
    const teams = currentDraw.teams.map((t) => ({ ...t, players: [...t.players] }));

    const from = teams[fromTeamIndex];
    const to = teams[toTeamIndex];
    if (!from || !to) return;

    const fromIdx = from.players.findIndex((p) => p.id === playerId);
    if (fromIdx === -1) return;

    const [player] = from.players.splice(fromIdx, 1);
    if (!player) return;

    const boundedIndex = Math.max(0, Math.min(toIndex, to.players.length));
    to.players.splice(boundedIndex, 0, player);

    const next = recomputeDraw({ ...currentDraw, teams });
    setCurrentDraw(next);
  };

  const onDragStartPlayer = (e: React.DragEvent, player: Player, fromTeamIndex: number) => {
    dragRef.current = { playerId: player.id, fromTeamIndex };
    setDraggingPlayerId(player.id);
    setDragOverKey(null);
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ playerId: player.id, fromTeamIndex }));
    } catch {}
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEndPlayer = () => {
    dragRef.current = null;
    setDraggingPlayerId(null);
    setDragOverKey(null);
  };

  const readDragPayload = (e: React.DragEvent): { playerId: string; fromTeamIndex: number } | null => {
    if (dragRef.current) return dragRef.current;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { playerId?: string; fromTeamIndex?: number };
      const playerId = typeof parsed.playerId === 'string' ? parsed.playerId : '';
      const fromTeamIndex = typeof parsed.fromTeamIndex === 'number' ? parsed.fromTeamIndex : NaN;
      if (!playerId || !Number.isFinite(fromTeamIndex)) return null;
      return { playerId, fromTeamIndex };
    } catch {
      return null;
    }
  };

  const onDropOnTeam = (e: React.DragEvent, toTeamIndex: number) => {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload) return;
    const { playerId, fromTeamIndex } = payload;
    const toIndex = currentDraw?.teams[toTeamIndex]?.players.length ?? 0;
    movePlayer({ playerId, fromTeamIndex, toTeamIndex, toIndex });
    onDragEndPlayer();
  };

  const onDropOnPlayer = (e: React.DragEvent, toTeamIndex: number, toIndex: number) => {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (!payload) return;
    const { playerId, fromTeamIndex } = payload;
    if (fromTeamIndex === toTeamIndex) {
      const currentPlayers = currentDraw?.teams[toTeamIndex]?.players ?? [];
      const fromIdx = currentPlayers.findIndex((p) => p.id === playerId);
      if (fromIdx !== -1) {
        const adjustedTo = fromIdx < toIndex ? Math.max(0, toIndex - 1) : toIndex;
        movePlayer({ playerId, fromTeamIndex, toTeamIndex, toIndex: adjustedTo });
        onDragEndPlayer();
        return;
      }
    }
    movePlayer({ playerId, fromTeamIndex, toTeamIndex, toIndex });
    onDragEndPlayer();
  };

  if (!user) return <Navigate to="/" replace />;

  if (peladasLoading && !pelada) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 text-white font-normal">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/15 border-t-white/60 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Carregando pelada...</p>
        </div>
      </div>
    );
  }

  if (!pelada) {
    return <Navigate to="/pelada" replace />;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white selection:bg-cyan-500/30 pb-20 font-normal relative overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[150px] rounded-full" />
      </div>
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/pelada" className="flex items-center gap-2 sm:gap-3 cursor-pointer" title="Trocar pelada">
              <img
                src="/logo.svg"
                alt={t['app.name']}
                className="w-8 h-8 sm:w-10 h-10 rounded-lg sm:rounded-xl shadow-lg shadow-cyan-500/20"
                draggable={false}
              />
              <div className="hidden xs:block">
                <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase">{t['app.name']}</h1>
                <p className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[140px] sm:max-w-[200px]">{pelada.name}</p>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-xl sm:rounded-2xl">
            {(['dashboard', 'players', 'draw', 'events'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all ${
                  activeTab === tab
                    ? 'bg-white/10 text-cyan-400 shadow-xl'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {t[`${tab}.title`] || tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleShare}
              disabled={shareLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {shareLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                  Gerando...
                </>
              ) : shareCopied ? (
                <>
                  <span className="text-green-400">✓</span> Copiado!
                </>
              ) : (
                <>
                  <span>🔗</span> Compartilhar
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-white/20 hover:text-red-500 transition-colors"
            >
              <span>Sair</span>
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <span className="text-xl">👋</span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-black tracking-tight uppercase">Bem-vindo, {user.name.split(' ')[0]}</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Seu painel de gerenciamento está pronto.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
              <div className="bg-white/[0.03] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 sm:mb-2">{t['dashboard.total_players']}</span>
                <span className="text-4xl sm:text-6xl font-black text-white">{players.length}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 sm:mb-2">{t['dashboard.avg_overall']}</span>
                <span className="text-4xl sm:text-6xl font-black text-cyan-400">{avgOverall}</span>
              </div>
              <div
                className={`border border-cyan-500/20 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center justify-center transition-transform ${isAdmin ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 cursor-pointer hover:scale-[1.02]' : 'bg-white/[0.03] cursor-default'}`}
                onClick={() => isAdmin && setActiveTab('players')}
              >
                <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 sm:mb-2">Ação Rápida</span>
                <span className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">{isAdmin ? '+ NOVO JOGADOR' : 'Visualize o elenco'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-yellow-500/10">🏆</div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white/90 uppercase">{t['dashboard.top_players']}</h2>
            </div>

            {players.length < 1 ? (
              <div className="p-12 sm:p-20 border-2 border-dashed border-white/5 rounded-[30px] sm:rounded-[40px] text-center text-white/20 font-black text-xl sm:text-2xl uppercase tracking-tighter">
                Adicione jogadores no elenco para ver o ranking
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
                {topPlayers.map((p, idx) => (
                  <div key={p.id} className="relative group transition-transform hover:scale-105">
                    <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 z-10 w-8 h-8 sm:w-10 h-10 bg-cyan-500 text-black font-black text-xl sm:text-2xl rounded-full flex items-center justify-center border-2 sm:border-4 border-[#050810] shadow-xl">
                      {idx + 1}
                    </div>
                    <PlayerCard sport={pelada.sport} player={p} onClick={() => { setSelectedPlayer(p); setActiveTab('players'); }} />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 sm:mt-20 flex justify-center">
              <button
                onClick={openDrawSetup}
                className="group relative px-10 sm:px-16 py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative font-black text-lg sm:text-2xl tracking-widest uppercase">Sortear Times</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12 border-b border-white/5 pb-8 sm:pb-12">
              <div className="flex-1">
                <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tighter uppercase">{t['players.title']}</h2>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder={t['players.search']}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                    />
                    <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 opacity-30 text-base sm:text-lg">🔍</span>
                  </div>
                  <p className="text-white/30 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest hidden lg:block">
                    {players.length} JOGADORES TOTAL
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={handleAddPlayer}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 group"
                >
                  <span className="text-lg group-hover:rotate-90 transition-transform">+</span> {t['players.add']}
                </button>
              )}
            </div>

            {playersLoading ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <PlayerCardSkeleton key={idx} index={idx} statsCount={sportSchema.attributeKeys.length} />
                ))}
              </div>
            ) : filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {filteredPlayers.map(p => (
                  <PlayerCard
                    key={p.id}
                    sport={pelada.sport}
                    player={p}
                    isAdmin={isAdmin}
                    onClick={() => setSelectedPlayer(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 sm:py-32 text-center text-white/10 font-black text-2xl sm:text-3xl tracking-tighter uppercase">
                {searchQuery ? 'Nenhum craque encontrado' : 'Nenhum jogador no elenco'}
              </div>
            )}
          </section>
        )}

        {activeTab === 'draw' && currentDraw && (
          <section className="animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 gap-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">TÁTICA DE JOGO</h2>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Arraste jogadores para editar os times
                </div>
                {currentDraw.teams.length >= 2 && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Confronto</div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <select
                        value={currentDraw.matchup?.homeTeamId ?? currentDraw.teams[0].id}
                        onChange={(e) => {
                          const homeTeamId = e.target.value;
                          const awayTeamId = currentDraw.matchup?.awayTeamId ?? currentDraw.teams[1].id;
                          const awayFinal = awayTeamId === homeTeamId ? (currentDraw.teams.find((t) => t.id !== homeTeamId)?.id ?? awayTeamId) : awayTeamId;
                          const nextTeams = [
                            ...currentDraw.teams.filter((t) => t.id === homeTeamId),
                            ...currentDraw.teams.filter((t) => t.id === awayFinal),
                            ...currentDraw.teams.filter((t) => t.id !== homeTeamId && t.id !== awayFinal),
                          ];
                          setCurrentDraw({
                            ...currentDraw,
                            teams: nextTeams,
                            matchup: { homeTeamId, awayTeamId: awayFinal },
                          });
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 focus:outline-none focus:border-cyan-500/50"
                      >
                        {currentDraw.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-white/20 font-black">×</span>
                      <select
                        value={currentDraw.matchup?.awayTeamId ?? currentDraw.teams[1].id}
                        onChange={(e) => {
                          const awayTeamId = e.target.value;
                          const homeTeamId = currentDraw.matchup?.homeTeamId ?? currentDraw.teams[0].id;
                          const homeFinal = homeTeamId === awayTeamId ? (currentDraw.teams.find((t) => t.id !== awayTeamId)?.id ?? homeTeamId) : homeTeamId;
                          const nextTeams = [
                            ...currentDraw.teams.filter((t) => t.id === homeFinal),
                            ...currentDraw.teams.filter((t) => t.id === awayTeamId),
                            ...currentDraw.teams.filter((t) => t.id !== homeFinal && t.id !== awayTeamId),
                          ];
                          setCurrentDraw({
                            ...currentDraw,
                            teams: nextTeams,
                            matchup: { homeTeamId: homeFinal, awayTeamId },
                          });
                        }}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 focus:outline-none focus:border-cyan-500/50"
                      >
                        {currentDraw.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const homeTeamId = currentDraw.matchup?.homeTeamId ?? currentDraw.teams[0].id;
                          const awayTeamId = currentDraw.matchup?.awayTeamId ?? currentDraw.teams[1].id;
                          const nextTeams = [
                            ...currentDraw.teams.filter((t) => t.id === awayTeamId),
                            ...currentDraw.teams.filter((t) => t.id === homeTeamId),
                            ...currentDraw.teams.filter((t) => t.id !== homeTeamId && t.id !== awayTeamId),
                          ];
                          setCurrentDraw({
                            ...currentDraw,
                            teams: nextTeams,
                            matchup: { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-cyan-400 hover:border-cyan-500/30 transition"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3 mt-2">
                  <div className="px-2 sm:px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Equilíbrio</span>
                    <span className={`text-xs sm:text-sm font-bold ${currentDraw.balanceScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {currentDraw.balanceScore}%
                    </span>
                  </div>
                  <div className="px-2 sm:px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Diferença OVR</span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-400">
                      {currentDraw.diff}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setDrawActionsOpen((v) => !v)}
                  className="sm:hidden w-full px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-cyan-300 hover:border-cyan-500/30 transition inline-flex items-center justify-center gap-2"
                  aria-expanded={drawActionsOpen}
                >
                  Ações
                  <span className={["transition-transform", drawActionsOpen ? "rotate-180" : ""].join(" ")}>▾</span>
                </button>

                <div className={[drawActionsOpen ? "block" : "hidden", "sm:block mt-2 sm:mt-0"].join(" ")}>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawHistoryOpen(true);
                        setDrawActionsOpen(false);
                      }}
                      className="text-white/50 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:text-cyan-300 flex items-center justify-center gap-2 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-white/5 transition-all shadow-xl"
                    >
                      Histórico
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveCurrentDrawToHistory();
                        setDrawActionsOpen(false);
                      }}
                      className="text-white/80 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:text-black flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-400 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-emerald-400/20 hover:border-emerald-300 transition-all shadow-xl"
                    >
                      Salvar times
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        runDraw();
                        setDrawActionsOpen(false);
                      }}
                      className="text-cyan-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:text-cyan-300 flex items-center justify-center gap-2 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-white/5 transition-all shadow-xl"
                    >
                      Refazer Sorteio ↻
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-4 lg:sticky lg:top-32 order-1">
                <MatchTimer storageKey={`pelada_match_timer_v1_${pelada.id}_${user.id}`} />
                <MatchGoals
                  storageKey={`pelada_match_goals_v1_${pelada.id}_${user.id}_${currentDraw.id}`}
                  timerStorageKey={`pelada_match_timer_v1_${pelada.id}_${user.id}`}
                  homeTeam={
                    currentDraw.matchup?.homeTeamId
                      ? (currentDraw.teams.find((t) => t.id === currentDraw.matchup!.homeTeamId) ?? currentDraw.teams[0])
                      : currentDraw.teams[0]
                  }
                  awayTeam={
                    currentDraw.matchup?.awayTeamId
                      ? (currentDraw.teams.find((t) => t.id === currentDraw.matchup!.awayTeamId) ?? currentDraw.teams[1] ?? currentDraw.teams[0])
                      : (currentDraw.teams[1] ?? currentDraw.teams[0])
                  }
                />
              </div>

              <div className="lg:col-span-3 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-32 order-2">
                <PitchSVG
                  draw={currentDraw}
                  onPlayerDoubleClick={(p) => {
                    setSelectedPlayer(p);
                    setActiveTab('players');
                  }}
                />
              </div>

              <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 space-y-6 sm:space-y-8 order-3">
                {currentDraw.teams.map((team, idx) => (
                  <div
                    key={team.id}
                    className={`bg-white/[0.03] border rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 relative overflow-hidden group transition-all shadow-xl ${
                      draggingPlayerId ? 'border-cyan-500/30' : 'border-white/10 hover:border-white/20'
                    }`}
                    onDragOver={(e) => {
                      if (!draggingPlayerId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverKey(`team-${idx}`);
                    }}
                    onDragLeave={() => {
                      setDragOverKey((prev) => (prev === `team-${idx}` ? null : prev));
                    }}
                    onDrop={(e) => onDropOnTeam(e, idx)}
                  >
                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full" style={{ backgroundColor: team.colorHex }} />
                    {dragOverKey === `team-${idx}` && draggingPlayerId && (
                      <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none" />
                    )}
                    <div className="flex justify-between items-end mb-4 sm:mb-6">
                      <div>
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-1">TIME {idx + 1}</span>
                        <div className="flex items-center gap-3">
                          {editingTeamId === team.id ? (
                            <input
                              value={editingTeamName}
                              onChange={(e) => setEditingTeamName(e.target.value)}
                              onBlur={commitTeamName}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitTeamName();
                                if (e.key === 'Escape') cancelTeamNameEdit();
                              }}
                              autoFocus
                              className="text-xl sm:text-2xl font-black tracking-tight uppercase bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 text-white"
                            />
                          ) : (
                            <h3
                              className="text-xl sm:text-2xl font-black tracking-tight uppercase cursor-text"
                              style={{ color: team.colorHex }}
                              onDoubleClick={() => startEditingTeam(team.id)}
                              title="Duplo clique para renomear"
                            >
                              {team.name}
                            </h3>
                          )}
                          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                            Editável
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 block tracking-widest uppercase">Média</span>
                        <span className="text-2xl sm:text-3xl font-black text-white">{team.avgOverall}</span>
                        <span className="block text-[7px] sm:text-[8px] font-black text-white/20 uppercase">TOTAL: {team.totalOverall}</span>
                      </div>
                    </div>

                    <div
                      className={`space-y-2 sm:space-y-3 rounded-2xl ${
                        dragOverKey === `end-${idx}` && draggingPlayerId ? 'ring-2 ring-cyan-400/30' : ''
                      }`}
                      onDragOver={(e) => {
                        if (!draggingPlayerId) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverKey(`end-${idx}`);
                      }}
                      onDragLeave={() => {
                        setDragOverKey((prev) => (prev === `end-${idx}` ? null : prev));
                      }}
                      onDrop={(e) => onDropOnTeam(e, idx)}
                    >
                      {team.players.map((p, playerIndex) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => onDragStartPlayer(e, p, idx)}
                          onDragEnd={onDragEndPlayer}
                          onDragOver={(e) => {
                            if (!draggingPlayerId) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverKey(`player-${idx}-${playerIndex}`);
                          }}
                          onDragLeave={() => {
                            setDragOverKey((prev) => (prev === `player-${idx}-${playerIndex}` ? null : prev));
                          }}
                          onDrop={(e) => onDropOnPlayer(e, idx, playerIndex)}
                          className={`flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border transition-colors cursor-grab active:cursor-grabbing select-none ${
                            draggingPlayerId === p.id
                              ? 'opacity-50 border-cyan-500/30'
                              : 'border-white/5 hover:bg-white/[0.05]'
                          } ${
                            dragOverKey === `player-${idx}-${playerIndex}` && draggingPlayerId
                              ? 'ring-2 ring-cyan-400/40'
                              : ''
                          }`}
                          onClick={() => {
                            if (draggingPlayerId) return;
                            setSelectedPlayer(p);
                            setActiveTab('players');
                          }}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="w-7 h-7 sm:w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[8px] sm:text-[9px] font-black text-white/40">
                              {p.primaryPosition}
                            </span>
                            <span className="font-bold text-xs sm:text-sm tracking-tight text-white/90">{p.nick}</span>
                          </div>
                          <span className="font-black text-lg sm:text-xl opacity-40">{p.overall}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'draw' && !currentDraw && (
          <div className="py-24 sm:py-40 text-center animate-in zoom-in-95 duration-500">
            <div className="mb-6 sm:mb-10 text-6xl sm:text-8xl opacity-20">⚽</div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tighter text-white/20 mb-8 sm:mb-10 uppercase">AINDA NÃO HÁ SORTEIO</h2>
            {!drawConfigReady ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={openDrawSetup}
                  className="bg-cyan-500 text-black px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black uppercase text-xs sm:text-sm tracking-widest hover:scale-105 transition-all shadow-2xl shadow-cyan-500/20"
                >
                  SORTEAR AGORA
                </button>
                {drawHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawHistoryOpen(true)}
                    className="px-8 sm:px-12 py-4 sm:py-5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition"
                  >
                    Ver histórico
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="mb-6 sm:mb-8 bg-white/[0.03] border border-white/10 rounded-[28px] p-6 sm:p-8 text-left">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Configurações do sorteio</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Presentes</div>
                      <div className="text-2xl font-black text-white">
                        {(effectivePresentIds.length ? effectivePresentPlayers.length : presentPlayers.length) || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={openDrawSetup}
                    className="px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={runDraw}
                    className="bg-cyan-500 text-black px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black uppercase text-xs sm:text-sm tracking-widest hover:scale-105 transition-all shadow-2xl shadow-cyan-500/20"
                  >
                    SORTEAR AGORA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <AgendaTab
            peladaId={pelada.id}
            userId={user.id}
            isAdmin={isAdmin}
            players={players}
            onStartDrawWithPlayerIds={openDrawSetupWithPlayerIds}
          />
        )}
      </main>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500"
            onClick={() => {
              if (!showDeleteConfirm) void closeSelectedPlayer();
            }}
          />

          <div className="relative bg-[#0c1220] border border-white/10 rounded-[30px] sm:rounded-[60px] w-full max-w-6xl max-h-[96vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-400">
            <div className="w-full md:w-[42%] p-6 sm:p-12 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col items-center border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto custom-scrollbar">
              <div className="w-full aspect-[3/4] max-w-[200px] sm:max-w-[280px] mb-6 sm:mb-12 shadow-2xl">
                <PlayerCard player={selectedPlayer} isAdmin={isAdmin} />
              </div>

              <div className="w-full max-w-[240px] sm:max-w-[320px] aspect-square mb-6 sm:mb-12">
                <RadarChart sport={pelada.sport} attributes={selectedPlayer.attributes} color="#22d3ee" />
              </div>

              {isAdmin && (
                <div className="w-full space-y-3 sm:space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 sm:gap-3"
                  >
                    <span>📷</span> {t['photo.upload']}
                  </button>
                  {selectedPlayer.photoUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      className="w-full py-3.5 sm:py-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-black transition-all flex items-center justify-center gap-2 sm:gap-3"
                    >
                      <span>🗑️</span> Remover foto
                    </button>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t['photo.link']}
                      className="w-full py-3.5 sm:py-4 bg-black/30 border border-white/5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-bold px-10 sm:px-12 focus:outline-none focus:border-cyan-500/50 transition-all text-white/80"
                      onBlur={(e) => handlePhotoLink(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePhotoLink((e.target as HTMLInputElement).value)}
                    />
                    <span className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 opacity-30">🔗</span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:w-[58%] p-6 sm:p-12 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8 sm:mb-16">
                <div className="flex-1 pr-4">
                  {isAdmin ? (
                    <input
                      type="text"
                      value={selectedPlayer.nick}
                      onChange={(e) => {
                        updateSelectedPlayer((p) => ({ ...p, nick: e.target.value.toUpperCase() }));
                      }}
                      className="text-3xl sm:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 mb-3 sm:mb-4 w-full text-white outline-none tracking-tighter uppercase"
                    />
                  ) : (
                    <h2 className="text-3xl sm:text-6xl font-black p-0 mb-3 sm:mb-4 w-full text-white tracking-tighter uppercase">
                      {selectedPlayer.nick}
                    </h2>
                  )}
                  {!isAdmin && (
                    <div className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">
                      Somente o admin pode editar jogadores
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {POSITIONS.map(pos => (
                      isAdmin ? (
                        <button
                          key={pos}
                          onClick={() => {
                            updateSelectedPlayer((p) => ({ ...p, primaryPosition: pos }), { recalcOverall: true });
                          }}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black transition-all ${
                            selectedPlayer.primaryPosition === pos
                              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 scale-105'
                              : 'bg-white/5 text-white/30 hover:bg-white/10'
                          }`}
                        >
                          {pos}
                        </button>
                      ) : (
                        <span
                          key={pos}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black ${
                            selectedPlayer.primaryPosition === pos ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {pos}
                        </span>
                      )
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  !showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-500/10 hover:bg-red-500/30 text-red-500 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-all"
                    >
                      Excluir
                    </button>
                  ) : (
                    <div className="flex flex-col items-end gap-1.5 sm:gap-2 animate-in slide-in-from-right-4">
                      <span className="text-[8px] sm:text-[10px] font-black text-red-400 uppercase">Confirmar?</span>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button onClick={executeRemovePlayer} className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase">SIM</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="bg-white/10 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase">NÃO</button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-8 sm:gap-y-12 mb-12 sm:mb-20">
                {sportSchema.attributeKeys.map((key) => (
                  <div key={key} className="group">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <label className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">
                        {t[`attr.${String(key)}`] || sportSchema.attributeLabels[key] || String(key)}
                      </label>
                      <span className="font-black text-2xl sm:text-3xl text-cyan-400">{selectedPlayer.attributes[key] ?? sportSchema.defaultAttributes[key] ?? 0}</span>
                    </div>
                    {isAdmin ? (
                      <input
                        type="range"
                        min="0"
                        max="99"
                        value={selectedPlayer.attributes[key] ?? sportSchema.defaultAttributes[key] ?? 0}
                        onChange={(e) => updatePlayerAttribute(selectedPlayer.id, key, parseInt(e.target.value))}
                        className="w-full h-1.5 sm:h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                      />
                    ) : (
                      <div className="w-full h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/50 rounded-full" style={{ width: `${selectedPlayer.attributes[key] ?? sportSchema.defaultAttributes[key] ?? 0}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 pt-8 sm:pt-12 border-t border-white/5">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      const nextFoot = selectedPlayer.dominantFoot === 'DIREITO' ? 'ESQUERDO' : selectedPlayer.dominantFoot === 'ESQUERDO' ? 'AMBOS' : 'DIREITO';
                      updateSelectedPlayer((p) => ({ ...p, dominantFoot: nextFoot as 'DIREITO' | 'ESQUERDO' | 'AMBOS' }));
                    }}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition"
                  >
                    Pé: {selectedPlayer.dominantFoot}
                  </button>
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Pé: {selectedPlayer.dominantFoot}
                  </span>
                )}

                <button
                  onClick={() => void closeSelectedPlayer()}
                  className="w-full sm:w-auto bg-white text-black px-12 sm:px-16 py-4 sm:py-5 rounded-2xl sm:rounded-[28px] font-black text-xs sm:text-sm tracking-widest hover:bg-cyan-400 hover:scale-[1.02] transition-all shadow-2xl"
                >
                  {isAdmin ? "FECHAR E SALVAR" : "FECHAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {drawSetupOpen && (
        <DrawSetupStep
          players={players}
          sport={pelada.sport}
          initialSelectedIds={
            presentIds.length
              ? presentIds
              : Array.isArray(currentDraw?.presentPlayerIds) && currentDraw.presentPlayerIds.length
                ? currentDraw.presentPlayerIds
                : players.map((p) => p.id)
          }
          onCancel={() => setDrawSetupOpen(false)}
          onConfirm={({ selectedIds }) => {
            setPresentIds(selectedIds);
            setDrawConfigReady(true);
            setDrawSetupOpen(false);
          }}
        />
      )}

      {drawHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setDrawHistoryOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-[28px] sm:rounded-[44px] border border-white/10 bg-[#0c1220] shadow-2xl">
            <div className="px-5 sm:px-10 py-5 sm:py-8 border-b border-white/5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Sorteios salvos</div>
                <div className="text-2xl sm:text-4xl font-black tracking-tighter uppercase">Histórico</div>
              </div>
              <button
                type="button"
                onClick={() => setDrawHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 sm:p-10 overflow-y-auto custom-scrollbar max-h-[calc(92vh-120px)]">
              {drawHistory.length === 0 ? (
                <div className="py-16 text-center text-white/20 font-black text-xl uppercase tracking-tight">
                  Nenhum sorteio salvo ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {drawHistory.map((d) => {
                    const title = `${d.teams?.[0]?.name ?? 'Time 1'} × ${d.teams?.[1]?.name ?? 'Time 2'}`;
                    const when = (d.updatedAt || d.createdAt || '').replace('T', ' ').slice(0, 19);
                    return (
                      <div
                        key={d.id}
                        className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{when || '—'}</div>
                          <div className="text-lg sm:text-2xl font-black tracking-tight uppercase truncate">{title}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                              Equilíbrio {d.balanceScore}%
                            </div>
                            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                              Diferença {d.diff}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const presentIdsFromDraw =
                                Array.isArray(d.presentPlayerIds) && d.presentPlayerIds.length
                                  ? d.presentPlayerIds
                                  : Array.from(new Set(d.teams.flatMap((t) => t.players.map((p) => p.id))));
                              setCurrentDraw(d);
                              setPresentIds(presentIdsFromDraw);
                              setDrawConfigReady(true);
                              setActiveTab('draw');
                              setDrawHistoryOpen(false);
                            }}
                            className="px-5 py-3 rounded-2xl bg-cyan-500 border border-cyan-400 text-[10px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 transition"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDrawFromHistory(d.id)}
                            className="px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-black transition"
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 5px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

