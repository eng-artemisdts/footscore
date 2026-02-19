import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pelada } from '../types';
import { peladaSlug } from '../utils';
import { CreatePeladaModal } from './CreatePeladaModal';

const PELADAS_KEY_PREFIX = 'futscore_peladas_';

function getPeladasKey(userId: string) {
  return `${PELADAS_KEY_PREFIX}${userId}`;
}

export function getPeladas(userId: string): Pelada[] {
  const data = localStorage.getItem(getPeladasKey(userId));
  return data ? JSON.parse(data) : [];
}

export function savePelada(userId: string, pelada: Pelada) {
  const list = getPeladas(userId);
  if (list.some((p) => p.id === pelada.id)) {
    const next = list.map((p) => (p.id === pelada.id ? pelada : p));
    localStorage.setItem(getPeladasKey(userId), JSON.stringify(next));
    return;
  }
  localStorage.setItem(getPeladasKey(userId), JSON.stringify([...list, pelada]));
}

interface PeladaSelectScreenProps {
  user: User;
}

export const PeladaSelectScreen: React.FC<PeladaSelectScreenProps> = ({ user }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const peladas = useMemo(() => getPeladas(user.id), [user.id, showModal]);

  const handleCreate = (pelada: Pelada) => {
    savePelada(user.id, pelada);
    setShowModal(false);
    navigate(`/pelada/${peladaSlug(pelada.name)}`, { replace: true });
  };

  const handleSelect = (pelada: Pelada) => {
    navigate(`/pelada/${peladaSlug(pelada.name)}`);
  };

  const firstName = user.name?.trim().split(' ')[0] || 'Craque';

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 overflow-hidden relative font-normal">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-4 group hover:scale-105 transition-transform duration-300">
            <span className="font-black text-3xl sm:text-4xl text-black">F</span>
          </div>
          <p className="text-[10px] font-bold text-cyan-400/90 uppercase tracking-[0.25em] mb-3">
            Olá, {firstName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase mb-1 text-white">
            Escolha a pelada
          </h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
            Ou crie uma nova
          </p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-2xl">
          {peladas.length === 0 ? (
            <div className="py-12 sm:py-16 text-center border-2 border-dashed border-white/10 rounded-3xl mb-6 bg-black/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-4xl">
                ⚽
              </div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">
                Nenhuma pelada ainda
              </p>
              <p className="text-white/40 text-sm font-medium max-w-[220px] mx-auto leading-relaxed">
                Crie sua primeira pelada para começar a gerenciar o elenco.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3 px-1">
                Suas peladas
              </p>
              <ul className="space-y-2.5 sm:space-y-3">
                {peladas.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left py-4 px-5 sm:py-5 sm:px-6 bg-black/30 border border-white/10 rounded-2xl hover:bg-white/[0.06] hover:border-cyan-500/25 active:scale-[0.99] transition-all duration-200 group flex items-center gap-4"
                    >
                      <span className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                        ⚽
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-sm sm:text-base uppercase tracking-tight text-white group-hover:text-cyan-300 transition-colors block truncate">
                          {p.name}
                        </span>
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                          Entrar na pelada →
                        </span>
                      </div>
                      <span className="text-white/20 group-hover:text-cyan-400 text-xl leading-none transition-colors shrink-0" aria-hidden>→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="relative before:absolute before:inset-0 before:flex before:items-center before:pt-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full mt-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-white text-black shadow-xl hover:bg-cyan-400 hover:shadow-cyan-500/20 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">+</span>
            Nova pelada
          </button>
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
