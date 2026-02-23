import { PeladaSport, Position } from "./types";

export type SportAttributeSchema = {
  attributeKeys: string[];
  attributeLabels: Record<string, string>;
  defaultAttributes: Record<string, number>;
  overallWeightsByPosition: Record<Position, Record<string, number>>;
};

const FUTEBOL: SportAttributeSchema = {
  attributeKeys: ["pace", "shooting", "passing", "dribbling", "defending", "physical"],
  attributeLabels: {
    pace: "RIT",
    shooting: "FIN",
    passing: "PAS",
    dribbling: "DRI",
    defending: "DEF",
    physical: "FIS",
  },
  defaultAttributes: {
    pace: 70,
    shooting: 70,
    passing: 70,
    dribbling: 70,
    defending: 70,
    physical: 70,
  },
  overallWeightsByPosition: {
    GOL: { pace: 0.1, shooting: 0.05, passing: 0.15, dribbling: 0.1, defending: 0.5, physical: 0.1 },
    ZAG: { pace: 0.15, shooting: 0.05, passing: 0.1, dribbling: 0.1, defending: 0.45, physical: 0.15 },
    LE: { pace: 0.25, shooting: 0.1, passing: 0.2, dribbling: 0.15, defending: 0.2, physical: 0.1 },
    LD: { pace: 0.25, shooting: 0.1, passing: 0.2, dribbling: 0.15, defending: 0.2, physical: 0.1 },
    VOL: { pace: 0.15, shooting: 0.1, passing: 0.25, dribbling: 0.15, defending: 0.25, physical: 0.1 },
    MEI: { pace: 0.15, shooting: 0.2, passing: 0.3, dribbling: 0.25, defending: 0.05, physical: 0.05 },
    ATA: { pace: 0.25, shooting: 0.35, passing: 0.1, dribbling: 0.2, defending: 0.05, physical: 0.05 },
  },
};

const SCHEMAS: Record<PeladaSport, SportAttributeSchema> = {
  FUTEBOL,
};

export function getSportSchema(sport: PeladaSport | null | undefined): SportAttributeSchema {
  const key = sport ?? "FUTEBOL";
  return SCHEMAS[key] ?? FUTEBOL;
}

export function coerceAttributesForSport(
  sport: PeladaSport | null | undefined,
  attributes: unknown,
): Record<string, number> {
  const schema = getSportSchema(sport);
  const obj = (attributes && typeof attributes === "object" ? (attributes as Record<string, unknown>) : {}) as Record<string, unknown>;
  const next: Record<string, number> = {};

  for (const key of schema.attributeKeys) {
    const raw = obj[key];
    const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    const safe = Number.isFinite(num) ? Math.max(0, Math.min(99, Math.round(num))) : schema.defaultAttributes[key] ?? 0;
    next[key] = safe;
  }

  return next;
}

