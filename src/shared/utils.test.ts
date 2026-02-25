import { decodeSharePayload, drawTeams, encodeSharePayload, peladaSlug, recalcOverall } from "@/shared/utils";
import { Player, SharePayload } from "@/shared/types";

describe("shared/utils", () => {
  it("peladaSlug normaliza acentos, espaços e símbolos", () => {
    expect(peladaSlug("  Pelada São João!  ")).toBe("pelada-sao-joao");
    expect(peladaSlug("A  B   C")).toBe("a-b-c");
  });

  it("encodeSharePayload/decodeSharePayload faz round-trip", () => {
    const player: Player = {
      id: "p1",
      userId: null,
      displayName: "João",
      nick: "J",
      photoUrl: null,
      primaryPosition: "MEI",
      secondaryPosition: null,
      dominantFoot: "DIREITO",
      presenceCount: 0,
      attributes: { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 },
      overall: 70,
    };

    const payload: SharePayload = { i: "x", n: "Pelada São", p: [player], d: null, t: 123 };
    const hash = encodeSharePayload(payload);
    const decoded = decodeSharePayload(hash);

    expect(decoded).not.toBeNull();
    expect(decoded?.n).toBe(payload.n);
    expect(decoded?.i).toBe("x");
    expect(decoded?.t).toBe(123);
    expect(decoded?.p).toEqual(payload.p);
    expect(decoded?.d).toBeNull();
  });

  it("decodeSharePayload retorna null para entradas inválidas", () => {
    expect(decodeSharePayload("")).toBeNull();
    expect(decodeSharePayload("#")).toBeNull();
    expect(decodeSharePayload("#invalido")).toBeNull();
  });

  it("recalcOverall usa defaults e faz clamp até 99", () => {
    const basePlayer: Player = {
      id: "p1",
      userId: null,
      displayName: "Goleiro",
      nick: "GK",
      photoUrl: null,
      primaryPosition: "GOL",
      secondaryPosition: null,
      dominantFoot: "DIREITO",
      presenceCount: 0,
      attributes: {},
      overall: 0,
    };

    expect(recalcOverall(basePlayer, "FUTEBOL")).toBe(70);

    const attacker: Player = {
      ...basePlayer,
      primaryPosition: "ATA",
      attributes: { pace: 99, shooting: 99, passing: 99, dribbling: 99, defending: 99, physical: 99 },
    };

    expect(recalcOverall(attacker, "FUTEBOL")).toBe(99);
  });

  it("drawTeams distribui jogadores e respeita limite por time", () => {
    const players: Player[] = [
      { id: "gk1", userId: null, displayName: "GK1", nick: "GK1", photoUrl: null, primaryPosition: "GOL", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 90 },
      { id: "gk2", userId: null, displayName: "GK2", nick: "GK2", photoUrl: null, primaryPosition: "GOL", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 70 },
      { id: "p1", userId: null, displayName: "P1", nick: "P1", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 80 },
      { id: "p2", userId: null, displayName: "P2", nick: "P2", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 60 },
      { id: "p3", userId: null, displayName: "P3", nick: "P3", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 50 },
      { id: "p4", userId: null, displayName: "P4", nick: "P4", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 40 },
    ];

    const sumOverall = players.reduce((acc, p) => acc + p.overall, 0);

    const original = Math.random;
    try {
      Math.random = () => 0.123456789;
      const draw = drawTeams(players, 2, "evt1");

      expect(draw.teams).toHaveLength(2);
      expect(draw.gkCoverage).toBe(true);

      const allIds = draw.teams.flatMap((t) => t.players.map((p) => p.id));
      expect(new Set(allIds).size).toBe(players.length);
      expect(allIds.sort()).toEqual(players.map((p) => p.id).sort());

      for (const t of draw.teams) {
        expect(t.players.length).toBe(3);
      }

      const totals = draw.teams.map((t) => t.totalOverall);
      expect(totals.reduce((a, b) => a + b, 0)).toBe(sumOverall);
      expect(draw.diff).toBe(Math.max(...totals) - Math.min(...totals));
      expect(draw.balanceScore).toBeGreaterThanOrEqual(0);
      expect(draw.balanceScore).toBeLessThanOrEqual(100);
    } finally {
      Math.random = original;
    }
  });

  it("drawTeams marca gkCoverage false quando não há goleiro suficiente", () => {
    const players: Player[] = [
      { id: "gk1", userId: null, displayName: "GK1", nick: "GK1", photoUrl: null, primaryPosition: "GOL", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 80 },
      { id: "p1", userId: null, displayName: "P1", nick: "P1", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 70 },
      { id: "p2", userId: null, displayName: "P2", nick: "P2", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 60 },
      { id: "p3", userId: null, displayName: "P3", nick: "P3", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 50 },
      { id: "p4", userId: null, displayName: "P4", nick: "P4", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 40 },
      { id: "p5", userId: null, displayName: "P5", nick: "P5", photoUrl: null, primaryPosition: "MEI", secondaryPosition: null, dominantFoot: "DIREITO", presenceCount: 0, attributes: {}, overall: 30 },
    ];

    const original = Math.random;
    try {
      Math.random = () => 0.123456789;
      const draw = drawTeams(players, 3, "evt2");
      expect(draw.gkCoverage).toBe(false);
    } finally {
      Math.random = original;
    }
  });
});

