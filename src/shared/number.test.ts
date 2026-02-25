import { clampInt, safeParseInt } from "@/shared/number";

describe("shared/number", () => {
  it("clampInt mantém valor dentro do intervalo", () => {
    expect(clampInt(5, 0, 10)).toBe(5);
  });

  it("clampInt limita para baixo", () => {
    expect(clampInt(-1, 0, 10)).toBe(0);
  });

  it("clampInt limita para cima", () => {
    expect(clampInt(999, 0, 10)).toBe(10);
  });

  it("safeParseInt parseia inteiros válidos", () => {
    expect(safeParseInt(" 42 ")).toBe(42);
  });

  it("safeParseInt retorna null para vazio", () => {
    expect(safeParseInt("")).toBeNull();
    expect(safeParseInt("   ")).toBeNull();
  });

  it("safeParseInt retorna null para inválido", () => {
    expect(safeParseInt("abc")).toBeNull();
  });
});

