import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Player, TeamDraw } from '../types';
import { TRANSLATIONS } from '../constants';
import { decodeSharePayload } from '../utils';
import { PlayerCard } from './PlayerCard';
import { PitchSVG } from './PitchSVG';

interface ViewData {
  peladaName: string;
  players: Player[];
  draw: TeamDraw | null;
  updatedAt: number;
}

function getInitialViewData(): ViewData | null {
  if (typeof window === 'undefined') return null;
  const payload = decodeSharePayload(window.location.hash || '');
  if (!payload) return null;
  return {
    peladaName: payload.n,
    players: payload.p,
    draw: payload.d ?? null,
    updatedAt: payload.t,
  };
}

export const ViewOnlyPelada: React.FC = () => {
  const [data, setData] = useState<ViewData | null>(getInitialViewData);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'draw'>('dashboard');

  const t = TRANSLATIONS['pt'] || TRANSLATIONS['en'];

  const topPlayers = useMemo(() => {
    if (!data?.players.length) return [];
    return [...data.players].sort((a, b) => b.overall - a.overall).slice(0, 5);
  }, [data?.players]);

  const avgOverall = useMemo(() => {
    if (!data?.players.length) return 0;
    return Math.round(
      data.players.reduce((acc, p) => acc + p.overall, 0) / data.players.length
    );
  }, [data?.players]);

  if (data === null) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl">🔗</span>
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight mb-2">Link inválido ou expirado</h1>
        <p className="text-white/40 text-sm text-center mb-6 max-w-sm">
          Este link de visualização não contém dados válidos. Peça um novo link ao administrador da pelada.
        </p>
        <Link
          to="/"
          className="px-6 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/15 transition"
        >
          Ir para o FutScore
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white selection:bg-cyan-500/30 pb-20 font-normal">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="font-black text-lg sm:text-2xl text-black">F</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase">{t['app.name']}</h1>
              <p className="text-[8px] sm:text-[9px] font-bold text-cyan-400 uppercase tracking-widest truncate max-w-[180px] sm:max-w-[240px]">
                {data.peladaName} — somente leitura
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-xl sm:rounded-2xl">
            {(['dashboard', 'players', 'draw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all ${
                  activeTab === tab
                    ? 'bg-white/10 text-cyan-400 shadow-xl'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {tab === 'draw' ? 'Sorteio' : tab === 'dashboard' ? 'Início' : 'Elenco'}
              </button>
            ))}
          </nav>

          <Link
            to="/"
            className="text-[10px] font-black uppercase text-white/30 hover:text-cyan-400 transition"
          >
            Entrar no app
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <span className="text-xl">👁</span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-black tracking-tight uppercase">Visualização da pelada</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Você está apenas visualizando. Para editar, entre na sua conta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
              <div className="bg-white/[0.03] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 sm:mb-2">{t['dashboard.total_players']}</span>
                <span className="text-4xl sm:text-6xl font-black text-white">{data.players.length}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 sm:mb-2">{t['dashboard.avg_overall']}</span>
                <span className="text-4xl sm:text-6xl font-black text-cyan-400">{avgOverall}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center justify-center">
                <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 sm:mb-2">Modo</span>
                <span className="text-lg font-black uppercase text-white/60">Somente leitura</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-yellow-500/10">🏆</div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white/90 uppercase">{t['dashboard.top_players']}</h2>
            </div>

            {data.players.length < 1 ? (
              <div className="p-12 sm:p-20 border-2 border-dashed border-white/5 rounded-[30px] sm:rounded-[40px] text-center text-white/20 font-black text-xl sm:text-2xl uppercase tracking-tighter">
                Nenhum jogador nesta pelada
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
                {topPlayers.map((p, idx) => (
                  <div key={p.id} className="relative group">
                    <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 z-10 w-8 h-8 sm:w-10 h-10 bg-cyan-500 text-black font-black text-xl sm:text-2xl rounded-full flex items-center justify-center border-2 sm:border-4 border-[#050810] shadow-xl">
                      {idx + 1}
                    </div>
                    <PlayerCard player={p} />
                  </div>
                ))}
              </div>
            )}

            {data.draw && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition"
                >
                  Ver sorteio de times →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl sm:text-4xl font-black mb-8 tracking-tighter uppercase">{t['players.title']}</h2>
            {data.players.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {[...data.players].sort((a, b) => b.overall - a.overall).map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            ) : (
              <div className="py-20 sm:py-32 text-center text-white/10 font-black text-2xl sm:text-3xl tracking-tighter uppercase">
                Nenhum jogador no elenco
              </div>
            )}
          </section>
        )}

        {activeTab === 'draw' && data.draw && (
          <section className="animate-in fade-in duration-700">
            <h2 className="text-3xl sm:text-4xl font-black mb-6 tracking-tighter uppercase">Tática de jogo</h2>
            <div className="flex items-center gap-2 sm:gap-3 mb-8">
              <div className="px-2 sm:px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1.5 sm:gap-2">
                <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Equilíbrio</span>
                <span className={`text-xs sm:text-sm font-bold ${data.draw.balanceScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {data.draw.balanceScore}%
                </span>
              </div>
              <div className="px-2 sm:px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-1.5 sm:gap-2">
                <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Diferença OVR</span>
                <span className="text-xs sm:text-sm font-bold text-cyan-400">{data.draw.diff}</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {data.draw.teams.map((team, idx) => (
                  <div key={team.id} className="bg-white/[0.03] border border-white/10 rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full" style={{ backgroundColor: team.colorHex }} />
                    <div className="flex justify-between items-end mb-4 sm:mb-6">
                      <div>
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-1">TIME {idx + 1}</span>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase" style={{ color: team.colorHex }}>{team.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] sm:text-[10px] font-black text-white/30 block tracking-widest uppercase">Média</span>
                        <span className="text-2xl sm:text-3xl font-black text-white">{team.avgOverall}</span>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {team.players.map((p) => (
                        <div key={p.id} className="flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5">
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
              <div className="lg:col-span-3 lg:sticky lg:top-32">
                <PitchSVG draw={data.draw} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'draw' && !data.draw && (
          <div className="py-24 sm:py-40 text-center animate-in zoom-in-95 duration-500">
            <div className="mb-6 sm:mb-10 text-6xl sm:text-8xl opacity-20">⚽</div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tighter text-white/20 mb-4 uppercase">Nenhum sorteio compartilhado</h2>
            <p className="text-white/30 text-sm">O administrador não incluiu um sorteio neste link.</p>
          </div>
        )}
      </main>
    </div>
  );
};
