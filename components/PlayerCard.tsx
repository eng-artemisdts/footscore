
import React from 'react';
import { Player } from '../types';
import { getCardRarity } from '../utils';
import { POSITION_COLORS, ATTR_LABELS } from '../constants';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  isAdmin?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, isAdmin }) => {
  const rarity = getCardRarity(player.overall);
  const posColor = POSITION_COLORS[player.primaryPosition];

  const allStats = [
    { label: ATTR_LABELS.pace, val: player.attributes.pace },
    { label: ATTR_LABELS.shooting, val: player.attributes.shooting },
    { label: ATTR_LABELS.passing, val: player.attributes.passing },
    { label: ATTR_LABELS.dribbling, val: player.attributes.dribbling },
    { label: ATTR_LABELS.defending, val: player.attributes.defending },
    { label: ATTR_LABELS.physical, val: player.attributes.physical },
  ];

  const renderFlag = () => {
    if (player.overall >= 80) return "from-green-600 via-yellow-400 to-blue-700";
    if (player.overall >= 60) return "from-blue-800 via-white to-red-700";
    return "from-red-600 via-white to-red-600";
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative w-full aspect-[3/4] rounded-[10%] cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 select-none overflow-hidden border-2 ${rarity.border}/50 shadow-2xl ${rarity.glow}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${rarity.bg}`} />
      <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-black/40 via-white/10 to-transparent pointer-events-none" />
      <div className={`absolute inset-0 border-[8px] ${rarity.ornament} pointer-events-none rounded-[8%]`} />
      <div className={`absolute inset-2 border ${rarity.innerOrnament} pointer-events-none rounded-[7%]`} />

      <div className="absolute top-6 left-6 z-40 flex flex-col items-start leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
        <span className={`font-black text-5xl ${rarity.ovrText} tracking-tighter`}>
          {player.overall}
        </span>
        <span className={`font-black text-lg ${rarity.text} opacity-95 tracking-widest mt-1`}>
          {player.primaryPosition}
        </span>
        <div className="mt-3 opacity-90">
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 10C1 10 3 11 8 11C13 11 23 7 23 4C23 1 20 1 18 1C16 1 14 3 12 5C10 7 5 8 1 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={rarity.text}/>
            <path d="M4 9L6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={rarity.text}/>
            <path d="M7 8L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={rarity.text}/>
          </svg>
        </div>
      </div>

      <div className="absolute top-4 right-0 left-0 bottom-[35%] flex justify-center items-end z-20 overflow-visible">
        {player.photoUrl ? (
          <div className="relative h-full flex items-end justify-center">
            <img src={player.photoUrl} alt="" className="absolute h-[110%] w-auto object-contain blur-lg opacity-20 scale-110 pointer-events-none z-10 translate-y-4" />
            <img src={player.photoUrl} alt={player.nick} className="relative z-20 h-[105%] w-auto object-contain drop-shadow-[0_15px_20px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-black/60 to-transparent z-30 pointer-events-none" />
          </div>
        ) : (
          <div className={`text-[120px] font-black ${rarity.text} opacity-20 select-none pb-8 uppercase`}>
            {player.nick.charAt(0)}
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 w-full h-[38%] z-30 flex flex-col items-center bg-gradient-to-t ${rarity.footerBg}`}>
        <div className="w-full flex justify-center py-2 mb-1">
          <h3 className={`font-black text-xl ${rarity.ovrText} uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center px-4 truncate`}>
            {player.nick}
          </h3>
        </div>

        <div className="grid grid-cols-6 w-full px-4 gap-0 mb-4">
          {allStats.map(s => (
            <div key={s.label} className="flex flex-col items-center border-r last:border-r-0 border-white/10">
              <span className={`font-bold text-[9px] ${rarity.text} opacity-70 uppercase tracking-tighter`}>{s.label}</span>
              <span className={`font-black text-lg ${rarity.ovrText} drop-shadow-sm`}>{s.val}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4 items-center opacity-95 mb-4">
          <div className={`w-7 h-5 bg-gradient-to-r ${renderFlag()} rounded-sm border border-white/20 shadow-md`} />
          <div className="flex flex-col items-center">
             <div className={`w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border ${rarity.innerOrnament}`}>
                <span className={`text-[6px] font-black ${rarity.text} italic`}>LIGA</span>
             </div>
          </div>
          <div className={`w-7 h-7 bg-white/10 rounded-full flex items-center justify-center border ${rarity.innerOrnament}`}>
             <span className={`text-[8px] font-black ${rarity.text}`}>FC</span>
          </div>
        </div>

        {isAdmin && (
           <div className="absolute bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <span className={`text-[7px] font-black uppercase tracking-widest ${rarity.text} bg-black/60 px-2 py-0.5 rounded-sm`}>
               EDIT
             </span>
           </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1.5 opacity-100 shadow-[0_-2px_5px_rgba(0,0,0,0.5)] z-40" style={{ backgroundColor: posColor }} />
    </div>
  );
};
