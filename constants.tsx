
import { Position } from './types';

export const POSITIONS: Position[] = ["GOL", "ZAG", "LE", "LD", "VOL", "MEI", "ATA"];

export const POSITION_COLORS: Record<Position, string> = {
  "GOL": "#ffab00",
  "ZAG": "#2979ff",
  "LE": "#2979ff",
  "LD": "#2979ff",
  "VOL": "#00e676",
  "MEI": "#00e676",
  "ATA": "#ff1744"
};

/**
 * Coordenadas refinadas para evitar sobreposição e dar profundidade ao campo.
 * Formato: [x, y] onde x é 0-100 e y é 0-100 (dentro da metade do time).
 */
export const POSITION_PITCH_COORDS: Record<Position, [number, number]> = {
  "GOL": [50, 10],
  "ZAG": [50, 30],
  "LE": [15, 35],
  "LD": [85, 35],
  "VOL": [50, 55],
  "MEI": [50, 75],
  "ATA": [50, 92]
};

export const ATTR_LABELS = {
  pace: "RIT",
  shooting: "FIN",
  passing: "PAS",
  dribbling: "DRI",
  defending: "DEF",
  physical: "FIS"
};

export const TRANSLATIONS: Record<string, any> = {
  pt: {
    "app.name": "FUTSCORE",
    "dashboard.title": "Dashboard",
    "dashboard.total_players": "Jogadores",
    "dashboard.avg_overall": "Média Geral",
    "dashboard.top_players": "Top 5 da Pelada",
    "players.title": "Elenco",
    "players.add": "Adicionar Atleta",
    "players.overall": "GERAL",
    "players.search": "Buscar craque...",
    "events.title": "Agenda",
    "events.add": "Marcar Pelada",
    "draw.title": "Sorteio",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "photo.upload": "Upload Foto",
    "photo.link": "Link (Instagram/Web)",
    "attr.pace": "Ritmo",
    "attr.shooting": "Finalização",
    "attr.passing": "Passe",
    "attr.dribbling": "Drible",
    "attr.defending": "Defesa",
    "attr.physical": "Físico"
  }
};