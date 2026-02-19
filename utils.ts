
import { Player, GroupSettings, Position, TeamDraw, Team } from './types';
import type { SharePayload } from './types';

export const generateId = () => Math.random().toString(36).slice(2, 10);

export function encodeSharePayload(payload: SharePayload): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return '';
  }
}

export function decodeSharePayload(hash: string): SharePayload | null {
  try {
    const raw = (hash || '').replace(/^#/, '').trim();
    if (!raw) return null;
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json) as Record<string, unknown>;
    if (!data || typeof data.n !== 'string' || !Array.isArray(data.p)) return null;
    return {
      n: data.n,
      p: data.p as SharePayload['p'],
      d: (data.d ?? null) as SharePayload['d'],
      t: typeof data.t === 'number' ? data.t : Date.now(),
    };
  } catch {
    return null;
  }
}

export const peladaSlug = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export const getOverallColor = (ovr: number) => {
  if (ovr >= 80) return '#fbbf24';
  if (ovr >= 60) return '#e5e7eb';
  return '#92400e';
};

export const getCardRarity = (ovr: number) => {
  if (ovr >= 80) return { 
    bg: 'from-[#1e150a] via-[#5d4718] to-[#1e150a]', 
    border: 'border-yellow-400',
    ornament: 'border-yellow-500/40',
    innerOrnament: 'border-yellow-200/20',
    text: 'text-yellow-100',
    ovrText: 'text-white',
    footerBg: 'from-black via-black/80 to-transparent',
    glow: 'shadow-yellow-500/20'
  };
  
  if (ovr >= 60) return { 
    bg: 'from-[#1a1c22] via-[#4a5061] to-[#1a1c22]', 
    border: 'border-slate-300',
    ornament: 'border-slate-400/40',
    innerOrnament: 'border-slate-100/20',
    text: 'text-slate-200',
    ovrText: 'text-white',
    footerBg: 'from-black via-black/80 to-transparent',
    glow: 'shadow-slate-300/15'
  };
  
  return { 
    bg: 'from-[#1a120d] via-[#4a2b1a] to-[#1a120d]', 
    border: 'border-orange-800',
    ornament: 'border-orange-900/50',
    innerOrnament: 'border-orange-600/20',
    text: 'text-orange-200',
    ovrText: 'text-white',
    footerBg: 'from-black via-black/80 to-transparent',
    glow: 'shadow-orange-900/15'
  };
};

export const recalcOverall = (player: Player): number => {
  const attrs = player.attributes;
  const WEIGHTS: Record<Position, any> = {
    GOL: { pace: 0.1, shooting: 0.05, passing: 0.15, dribbling: 0.1, defending: 0.5, physical: 0.1 },
    ZAG: { pace: 0.15, shooting: 0.05, passing: 0.1, dribbling: 0.1, defending: 0.45, physical: 0.15 },
    LE: { pace: 0.25, shooting: 0.1, passing: 0.2, dribbling: 0.15, defending: 0.2, physical: 0.1 },
    LD: { pace: 0.25, shooting: 0.1, passing: 0.2, dribbling: 0.15, defending: 0.2, physical: 0.1 },
    VOL: { pace: 0.15, shooting: 0.1, passing: 0.25, dribbling: 0.15, defending: 0.25, physical: 0.1 },
    MEI: { pace: 0.15, shooting: 0.2, passing: 0.3, dribbling: 0.25, defending: 0.05, physical: 0.05 },
    ATA: { pace: 0.25, shooting: 0.35, passing: 0.1, dribbling: 0.2, defending: 0.05, physical: 0.05 }
  };

  const w = WEIGHTS[player.primaryPosition] || WEIGHTS.MEI;
  const base = (attrs.pace * w.pace) + 
               (attrs.shooting * w.shooting) + 
               (attrs.passing * w.passing) + 
               (attrs.dribbling * w.dribbling) + 
               (attrs.defending * w.defending) + 
               (attrs.physical * w.physical);

  return Math.min(99, Math.round(base));
};

export const drawTeams = (players: Player[], teamsCount: number, eventId: string): TeamDraw => {
  const teamColors = ['#ff1744', '#2979ff', '#00e676', '#ffab00'];
  
  const teams: Team[] = Array.from({ length: teamsCount }, (_, i) => ({
    id: generateId(),
    name: `Time ${String.fromCharCode(65 + i)}`,
    colorHex: teamColors[i] || '#ffffff',
    players: [],
    totalOverall: 0,
    avgOverall: 0
  }));

  const gks = players.filter(p => p.primaryPosition === 'GOL').sort((a, b) => b.overall - a.overall);
  const field = players.filter(p => p.primaryPosition !== 'GOL').sort((a, b) => b.overall - a.overall);

  gks.forEach((gk, i) => {
    const targetTeam = teams[i % teamsCount];
    targetTeam.players.push(gk);
    targetTeam.totalOverall += gk.overall;
  });

  const maxPlayersPerTeam = Math.ceil(players.length / teamsCount);

  field.forEach(p => {
    const availableTeams = teams.filter(t => t.players.length < maxPlayersPerTeam);
    if (availableTeams.length > 0) {
      availableTeams.sort((a, b) => a.totalOverall - b.totalOverall || a.players.length - b.players.length);
      const targetTeam = availableTeams[0];
      targetTeam.players.push(p);
      targetTeam.totalOverall += p.overall;
    }
  });

  teams.forEach(t => {
    t.avgOverall = t.players.length ? Math.round(t.totalOverall / t.players.length) : 0;
  });

  const totals = teams.map(t => t.totalOverall);
  const maxOvr = Math.max(...totals);
  const minOvr = Math.min(...totals);
  const diff = maxOvr - minOvr;
  const balanceScore = Math.max(0, 100 - (diff * 2));

  return {
    id: generateId(),
    eventId,
    teams,
    diff,
    balanceScore,
    gkCoverage: gks.length >= teamsCount,
    createdAt: new Date().toISOString()
  };
};
