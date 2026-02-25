import { coerceAttributesForSport, getSportSchema } from "@/shared/sportSchemas";

describe("shared/sportSchemas", () => {
  it("getSportSchema usa fallback FUTEBOL quando sport é null", () => {
    const schema = getSportSchema(null);
    expect(schema.attributeKeys.length).toBe(6);
    expect(schema.attributeLabels.pace).toBe("RIT");
    expect(schema.overallWeightsByPosition.GOL.defending).toBe(0.5);
  });

  it("coerceAttributesForSport normaliza tipos e faz clamp 0-99", () => {
    const attrs = coerceAttributesForSport("FUTEBOL", {
      pace: "80.2",
      shooting: 120,
      passing: -5,
      dribbling: "x",
      defending: 50.9,
      physical: undefined,
    });

    expect(attrs.pace).toBe(80);
    expect(attrs.shooting).toBe(99);
    expect(attrs.passing).toBe(0);
    expect(attrs.dribbling).toBe(70);
    expect(attrs.defending).toBe(51);
    expect(attrs.physical).toBe(70);
  });
});

