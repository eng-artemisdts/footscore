import { useMemo } from "react";
import { Pelada } from "@/shared/types";

const PELADAS_KEY_PREFIX = "futscore_peladas_";

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

export function usePeladas(userId: string, refreshKey?: unknown) {
  return useMemo(() => getPeladas(userId), [userId, refreshKey]);
}

