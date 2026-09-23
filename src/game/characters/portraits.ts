import type { Fighter } from "../types";
import portraits from "../../../data/portraits.json";

export const PORTRAITS = portraits;
export const DEFAULT_PORTRAIT_ID = PORTRAITS[0].id;
export const isPortraitId = (value: unknown): value is string =>
  typeof value === "string" && PORTRAITS.some((p) => p.id === value);
export const portrait = (id?: string) =>
  PORTRAITS.find((p) => p.id === id) ?? PORTRAITS[0];

/** Stable encounter artwork shared by the map preview and battle generation. */
export function encounterPortrait(
  player: { name: string; portraitId?: string },
  expedition: number,
  stage: number,
) {
  const key = `${player.name}:${player.portraitId}:${expedition}:${stage}`;
  let hash = 2166136261;
  for (const char of key)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const pool = PORTRAITS.filter((p) => p.id !== player.portraitId);
  return pool[hash % pool.length];
}

/** Stable identity lets the map show the same opponent before combat starts. */
export function encounterIdentity(
  player: { name: string; portraitId?: string },
  expedition: number,
  stage: number,
) {
  let hash = 2166136261;
  for (const char of `${player.name}:${player.portraitId}:${expedition}:${stage}:identity`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const archetype: Fighter["archetype"] =
    stage === 1
      ? undefined
      : stage === 2
        ? hash % 2
          ? "warden"
          : "duelist"
        : stage === 3
          ? hash % 2
            ? "duelist"
            : "crusher"
          : hash % 2
            ? "crusher"
            : "ghost";
  const names = [
    "Безымянный",
    "Тихий странник",
    "Пепельный двойник",
    "Последний свидетель",
    "Забытый путник",
  ];
  return {
    name:
      stage === 1
        ? "Начинающий странник"
        : stage === 5
          ? "Босс круга"
          : names[(hash >>> 1) % names.length],
    archetype,
  };
}
