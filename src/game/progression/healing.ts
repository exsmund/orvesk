import { maxHp } from "../combat/engine";
import type { Game } from "../types";
export function useHealingCharge(saved: Game): Game {
  const g = structuredClone(saved);
  if (
    g.phase !== "combat" ||
    !g.clashPlan ||
    !g.journey ||
    g.clashPlan.playerPlaced.length
  )
    throw new Error("Лечение доступно перед размещением фигур.");
  if (g.journey.healUsed)
    throw new Error("Лечебный заряд уже использован в этом путешествии.");
  if (g.player.hp <= 0 || g.player.hp >= maxHp(g.player))
    throw new Error("Лечение сейчас не требуется.");
  g.player.hp = Math.min(
    maxHp(g.player),
    Math.round((g.player.hp + maxHp(g.player) * 0.5) * 10) / 10,
  );
  g.journey.healUsed = true;
  return g;
}
