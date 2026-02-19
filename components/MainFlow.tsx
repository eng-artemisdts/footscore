import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player, TeamDraw, User, Pelada } from '../types';
import { POSITIONS, TRANSLATIONS } from '../constants';
import { generateId, drawTeams, recalcOverall } from '../utils';
import { PlayerCard } from './PlayerCard';
import { PitchSVG } from './PitchSVG';
import { RadarChart } from './RadarChart';

const PLAYERS_STORAGE_KEY = (peladaId: string) => `pelada_players_${peladaId}`;

interface MainFlowProps {
  user: User;
  pelada: Pelada;
  onLogout: () => void;
}

export const MainFlow: React.FC<MainFlowProps> = ({ user, pelada, onLogout }) => {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(PLAYERS_STORAGE_KEY(pelada.id));
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'events' | 'draw'>('dashboard');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentDraw, setCurrentDraw] = useState<TeamDraw | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS['pt'] || TRANSLATIONS['en'];

  useEffect(() => {
    localStorage.setItem(PLAYERS_STORAGE_KEY(pelada.id), JSON.stringify(players));
  }, [players, pelada.id]);

  const topPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter(p =>
      p.nick.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.primaryPosition.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.overall - a.overall);
  }, [players, searchQuery]);

  const avgOverall = useMemo(() => {
    return players.length ? Math.round(players.reduce((acc, p) => acc + p.overall, 0) / players.length) : 0;
  }, [players]);

  const handleAddPlayer = () => {
    const newPlayer: Player = {
      id: generateId(),
      userId: null,
      displayName: 'Novo Jogador',
      nick: 'CRAQUE ' + (players.length + 1),
      photoUrl: null,
      primaryPosition: 'MEI',
      secondaryPosition: null,
      dominantFoot: 'DIREITO',
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
    setPlayers(prev => [...prev, newPlayer]);
    setSelectedPlayer(newPlayer);
  };

  const handleDraw = () => {
    if (players.length < 2) {
      alert("Adicione pelo menos 2 jogadores.");
      return;
    }
    const draw = drawTeams(players, 2, 'event-' + Date.now());
    setCurrentDraw(draw);
    setActiveTab('draw');
  };

  const updatePlayerAttribute = (playerId: string, attr: keyof Player['attributes'], value: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        const updatedAttrs = { ...p.attributes, [attr]: value };
        const updatedPlayer = { ...p, attributes: updatedAttrs };
        updatedPlayer.overall = recalcOverall(updatedPlayer);
        if (selectedPlayer?.id === playerId) {
          setSelectedPlayer(updatedPlayer);
        }
        return updatedPlayer;
      }
      return p;
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPlayer) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPlayers(prev => prev.map(p => {
          if (p.id === selectedPlayer.id) {
            const updated = { ...p, photoUrl: base64String };
            setSelectedPlayer(updated);
            return updated;
          }
          return p;
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoLink = (url: string) => {
    if (selectedPlayer && url) {
      setPlayers(prev => prev.map(p => {
        if (p.id === selectedPlayer.id) {
          const updated = { ...p, photoUrl: url };
          setSelectedPlayer(updated);
          return updated;
        }
        return p;
      }));
    }
  };

  const executeRemovePlayer = () => {
    if (!selectedPlayer) return;
    const idToRemove = selectedPlayer.id;
    setPlayers(prev => prev.filter(p => p.id !== idToRemove));
    setCurrentDraw(null);
    setSelectedPlayer(null);
    setShowDeleteConfirm(false);
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white selection:bg-cyan-500/30 pb-20 font-normal">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/pelada" className="flex items-center gap-2 sm:gap-3 cursor-pointer" title="Trocar pelada">
              <div className="w-8 h-8 sm:w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="font-black text-lg sm:text-2xl text-black">F</span>
              </div>
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

          <div className="flex items-center gap-4">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
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
              <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setActiveTab('players')}>
                <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 sm:mb-2">Ação Rápida</span>
                <span className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">+ NOVO JOGADOR</span>
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
                    <PlayerCard player={p} onClick={() => { setSelectedPlayer(p); setActiveTab('players'); }} />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 sm:mt-20 flex justify-center">
              <button
                onClick={handleDraw}
                className="group relative px-10 sm:px-16 py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative font-black text-lg sm:text-2xl tracking-widest uppercase">SORTEAR TIMES</span>
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
              <button
                onClick={handleAddPlayer}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 group"
              >
                <span className="text-lg group-hover:rotate-90 transition-transform">+</span> {t['players.add']}
              </button>
            </div>

            {filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {filteredPlayers.map(p => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    isAdmin
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
              <button
                onClick={handleDraw}
                className="text-cyan-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:text-cyan-300 flex items-center justify-center gap-2 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-white/5 transition-all shadow-xl"
              >
                Refazer Sorteio ↻
              </button>
            </div>

            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
                {currentDraw.teams.map((team, idx) => (
                  <div key={team.id} className="bg-white/[0.03] border border-white/10 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl">
                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full" style={{ backgroundColor: team.colorHex }} />
                    <div className="flex justify-between items-end mb-4 sm:mb-6">
                      <div>
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-1">TIME {idx + 1}</span>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase" style={{ color: team.colorHex }}>{team.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 block tracking-widest uppercase">Média</span>
                        <span className="text-2xl sm:text-3xl font-black text-white">{team.avgOverall}</span>
                        <span className="block text-[7px] sm:text-[8px] font-black text-white/20 uppercase">TOTAL: {team.totalOverall}</span>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {team.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => { setSelectedPlayer(p); setActiveTab('players'); }}>
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

              <div className="lg:col-span-3 lg:sticky lg:top-32 order-1 lg:order-2">
                <PitchSVG draw={currentDraw} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'draw' && !currentDraw && (
          <div className="py-24 sm:py-40 text-center animate-in zoom-in-95 duration-500">
            <div className="mb-6 sm:mb-10 text-6xl sm:text-8xl opacity-20">⚽</div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tighter text-white/20 mb-8 sm:mb-10 uppercase">AINDA NÃO HÁ SORTEIO</h2>
            <button
              onClick={handleDraw}
              className="bg-cyan-500 text-black px-8 sm:px-12 py-4 sm:py-5 rounded-full font-black uppercase text-xs sm:text-sm tracking-widest hover:scale-105 transition-all shadow-2xl shadow-cyan-500/20"
            >
              SORTEAR AGORA
            </button>
          </div>
        )}

        {activeTab === 'events' && (
          <section className="text-center py-20 sm:py-24 animate-in fade-in slide-in-from-top-4">
            <div className="max-w-md mx-auto px-4">
              <div className="w-16 h-16 sm:w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-inner">
                <span className="text-4xl sm:text-5xl">📅</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-tighter text-cyan-400 uppercase">EM BREVE</h2>
              <p className="text-white/30 mb-8 sm:mb-10 font-medium text-xs sm:text-sm leading-relaxed">Estamos polindo o sistema de agenda e confirmação automática.</p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-cyan-400 transition"
              >
                Voltar ao Início
              </button>
            </div>
          </section>
        )}
      </main>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => { if (!showDeleteConfirm) setSelectedPlayer(null); }} />

          <div className="relative bg-[#0c1220] border border-white/10 rounded-[30px] sm:rounded-[60px] w-full max-w-6xl max-h-[96vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-400">
            <div className="w-full md:w-[42%] p-6 sm:p-12 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col items-center border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto custom-scrollbar">
              <div className="w-full aspect-[3/4] max-w-[200px] sm:max-w-[280px] mb-6 sm:mb-12 shadow-2xl">
                <PlayerCard player={selectedPlayer} />
              </div>

              <div className="w-full max-w-[240px] sm:max-w-[320px] aspect-square mb-6 sm:mb-12">
                <RadarChart attributes={selectedPlayer.attributes} color="#22d3ee" />
              </div>

              <div className="w-full space-y-3 sm:space-y-4">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 sm:gap-3"
                >
                  <span>📷</span> {t['photo.upload']}
                </button>
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
            </div>

            <div className="w-full md:w-[58%] p-6 sm:p-12 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8 sm:mb-16">
                <div className="flex-1 pr-4">
                  <input
                    type="text"
                    value={selectedPlayer.nick}
                    onChange={(e) => {
                      const updated = { ...selectedPlayer, nick: e.target.value.toUpperCase() };
                      setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
                      setSelectedPlayer(updated);
                    }}
                    className="text-3xl sm:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 mb-3 sm:mb-4 w-full text-white outline-none tracking-tighter uppercase"
                  />
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {POSITIONS.map(pos => (
                      <button
                        key={pos}
                        onClick={() => {
                          const updated = { ...selectedPlayer, primaryPosition: pos };
                          updated.overall = recalcOverall(updated);
                          setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
                          setSelectedPlayer(updated);
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black transition-all ${
                          selectedPlayer.primaryPosition === pos
                            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 scale-105'
                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {!showDeleteConfirm ? (
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
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-8 sm:gap-y-12 mb-12 sm:mb-20">
                {Object.entries(selectedPlayer.attributes).map(([key, val]) => (
                  <div key={key} className="group">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <label className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">
                        {t[`attr.${key}`] || key}
                      </label>
                      <span className="font-black text-2xl sm:text-3xl text-cyan-400">{val}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="99"
                      value={val}
                      onChange={(e) => updatePlayerAttribute(selectedPlayer.id, key as keyof Player['attributes'], parseInt(e.target.value))}
                      className="w-full h-1.5 sm:h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 pt-8 sm:pt-12 border-t border-white/5">
                <button
                  onClick={() => {
                    const nextFoot = selectedPlayer.dominantFoot === 'DIREITO' ? 'ESQUERDO' : selectedPlayer.dominantFoot === 'ESQUERDO' ? 'AMBOS' : 'DIREITO';
                    const updated = { ...selectedPlayer, dominantFoot: nextFoot as 'DIREITO' | 'ESQUERDO' | 'AMBOS' };
                    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setSelectedPlayer(updated);
                  }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition"
                >
                  Pé: {selectedPlayer.dominantFoot}
                </button>

                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="w-full sm:w-auto bg-white text-black px-12 sm:px-16 py-4 sm:py-5 rounded-2xl sm:rounded-[28px] font-black text-xs sm:text-sm tracking-widest hover:bg-cyan-400 hover:scale-[1.02] transition-all shadow-2xl"
                >
                  FECHAR E SALVAR
                </button>
              </div>
            </div>
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
