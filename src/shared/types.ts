export type Position = 'GOL' | 'ZAG' | 'LE' | 'LD' | 'VOL' | 'MEI' | 'ATA';

export interface Attributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface Player {
  id: string;
  userId: string | null;
  displayName: string;
  nick: string;
  photoUrl: string | null;
  primaryPosition: Position;
  secondaryPosition: Position | null;
  dominantFoot: 'DIREITO' | 'ESQUERDO' | 'AMBOS';
  presenceCount: number;
  attributes: Attributes;
  overall: number;
}

export type EventStatus = 'ABERTO' | 'SORTEADO' | 'FINALIZADO';

export interface Event {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  format: string;
  teamsCount: number;
  status: EventStatus;
  attendees: string[];
  confirmedAttendees: string[];
  teamDrawId: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  colorHex: string;
  players: Player[];
  totalOverall: number;
  avgOverall: number;
}

export interface TeamDraw {
  id: string;
  eventId: string;
  teams: Team[];
  diff: number;
  balanceScore: number;
  gkCoverage: boolean;
  createdAt: string;
}

export interface GroupSettings {
  id: string;
  name: string;
  inviteCode: string;
  maxPresenceForBonus: number;
  language: 'pt' | 'en';
}

export type Plan = 'free' | 'pro';

export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled' | 'trialing';

export type PeladaRole = 'ADMIN' | 'PLAYER';

export type PeladaSport = 'FUTEBOL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PLAYER';
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
}

export interface Pelada {
  id: string;
  name: string;
  sport: PeladaSport;
  userId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SharePayload {
  i?: string;
  n: string;
  p: Player[];
  d: TeamDraw | null;
  t: number;
}

