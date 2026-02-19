
import React from 'react';
import { TeamDraw, Position, Player } from '../types';

interface PitchSVGProps {
  draw: TeamDraw;
}

export const PitchSVG: React.FC<PitchSVGProps> = ({ draw }) => {
  const teamA = draw.teams[0];
  const teamB = draw.teams[1];

  const getPlayerRow = (pos: Position): number => {
    if (pos === 'GOL') return 0;
    if (['ZAG', 'LE', 'LD', 'VOL'].includes(pos)) return 1;
    return 2;
  };

  const renderPlayer = (player: Player, teamColor: string, isBottom: boolean, x: number, y: number) => {
    const fieldPadding = 8;
    const halfHeight = 36;
    
    let finalY: number;
    if (isBottom) {
      const relativeY = (y / 100) * halfHeight;
      finalY = 94 - relativeY;
    } else {
      const relativeY = (y / 100) * halfHeight;
      finalY = fieldPadding + relativeY;
    }

    return (
      <g key={player.id} className="animate-fade-in-up">
        <circle cx={`${x}%`} cy={`${finalY + 0.8}%`} r="3.2" fill="black" opacity="0.3" />
        <circle 
          cx={`${x}%`} 
          cy={`${finalY}%`} 
          r="3.2" 
          fill={teamColor} 
          stroke="white" 
          strokeWidth="0.8" 
          className="transition-all duration-700 ease-out shadow-xl"
        />
        <text 
          x={`${x}%`} 
          y={`${finalY}%`} 
          dy="1.2" 
          textAnchor="middle" 
          fill="white" 
          fontSize="3.2" 
          fontWeight="900"
          className="pointer-events-none select-none"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {player.nick.charAt(0)}
        </text>

        <g transform={`translate(0, ${isBottom ? 5.5 : -8.5})`}>
          <rect 
            x={`${x - 9}%`} 
            y={`${finalY}%`} 
            width="18" 
            height="4.5" 
            rx="1" 
            fill="rgba(0,0,0,0.85)" 
            className="pointer-events-none"
          />
          <text 
            x={`${x}%`} 
            y={`${finalY + 3.2}%`} 
            textAnchor="middle" 
            fill="white" 
            fontSize="2.4" 
            fontWeight="800"
            className="pointer-events-none uppercase tracking-tight select-none"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {player.nick.split(' ')[0]}
          </text>
        </g>
      </g>
    );
  };

  const renderTeam = (team: any, isBottom: boolean) => {
    const rows: Player[][] = [[], [], []];
    team.players.forEach((p: Player) => {
      rows[getPlayerRow(p.primaryPosition)].push(p);
    });

    const rowYPositions = [10, 45, 85];

    return rows.flatMap((playersInRow, rowIndex) => {
      const totalInRow = playersInRow.length;
      const y = rowYPositions[rowIndex];
      
      return playersInRow.map((p, i) => {
        let x = 50;
        if (totalInRow > 1) {
          const spacing = 80 / (totalInRow + 1);
          x = spacing * (i + 1) + 10;
        }
        const jitter = totalInRow > 2 && i % 2 === 0 ? -5 : 0;
        return renderPlayer(p, team.colorHex, isBottom, x, y + jitter);
      });
    });
  };

  return (
    <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-[#143d14] to-[#0a1f0a] border-4 border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.1)_50%)] bg-[length:100%_10%]" />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grass.png')]" />
      
      <svg className="w-full h-full relative z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.4)" />
        <rect x="20" y="5" width="60" height="15" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <rect x="20" y="80" width="60" height="15" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <rect x="35" y="5" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        <rect x="35" y="89" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        <circle cx="50" cy="16" r="0.8" fill="rgba(255,255,255,0.4)" />
        <circle cx="50" cy="84" r="0.8" fill="rgba(255,255,255,0.4)" />
        <path d="M 38 20 Q 50 26 62 20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        <path d="M 38 80 Q 50 74 62 80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        {renderTeam(teamA, false)}
        {renderTeam(teamB, true)}
      </svg>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]" />
    </div>
  );
};