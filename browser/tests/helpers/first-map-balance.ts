import { createJourney } from "@/game/journey/journey";
import { beginClash, submitClash } from "@/game/combat/reaction-engine";
import {
  calculateClash,
  layer,
  placementCost,
} from "@/game/combat/clash-damage";
import { possiblePlacements, placementCells } from "@/game/combat/board";
import { shuffle, startDeck } from "@/game/combat/deck";
import { creature } from "@/game/creatures/catalog";
import type { Game, Placement, Stats } from "@/game/types";

export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Greedy, one-turn player. No lookahead or access to unrevealed enemy moves. */
export function simplePlayerPlan(g: Game, random: () => number): Placement[] {
  if ((g.player.stamina ?? 8) < 3) return [];
  const p = g.clashPlan!;
  const reacting = p.preparer === "enemy";
  const enemyMoves = reacting ? p.enemyPlaced : [];
  const opposing = reacting
    ? layer(g.enemy, enemyMoves, p.enemyModifiers)
    : undefined;
  const moves: Placement[] = [];
  const occupied: number[] = [];
  const score = (player: Placement[]) => {
    const calc = calculateClash(
      g,
      { player, enemy: enemyMoves },
      { player: {}, enemy: p.enemyModifiers },
    );
    return (
      calc.enemyDamage -
      calc.playerDamage +
      0.25 * calc.sides.enemy.staminaLoss +
      player.length * 0.01
    );
  };
  let current = score(moves);
  for (;;) {
    let best:
      { placement: Placement; cells: number[]; score: number } | undefined;
    for (const card of g.player.deck!.hand) {
      if (moves.some((m) => m.id === card.id)) continue;
      for (const placement of shuffle(
        possiblePlacements(card, p.blocked, occupied),
        random,
      )) {
        const next = [...moves, placement];
        if (placementCost(g.player, next, {}, opposing).remaining < 0) continue;
        const value = score(next);
        if (value > (best?.score ?? current))
          best = {
            placement,
            cells: placementCells(card, placement, {}),
            score: value,
          };
      }
    }
    if (!best) return moves;
    moves.push(best.placement);
    occupied.push(...best.cells);
    current = best.score;
  }
}

export function simulateFirstMapBattle(options: {
  seed: number;
  creatureId: string;
  stage: number;
  stats?: Stats;
  original?: boolean;
}) {
  const random = seededRandom(options.seed);
  let g = createJourney(
    "Безоружный",
    random,
    undefined,
    options.stats ?? {
      strength: 1,
      agility: 1,
      vitality: 1,
      intelligence: 4,
    },
  );
  g.journey!.stage = options.stage;
  g.enemy = structuredClone(g.journey!.enemies![`fight-${options.stage}`]);
  g.enemy.creatureId = options.creatureId;
  g.enemy.name = creature(options.creatureId)!.name;
  g.enemy.portraitId = `creature:${options.creatureId}`;
  if (options.original) {
    delete g.enemy.creatureVariant;
    // Preserve the original profile as an already-started battle for comparison.
    startDeck(g.enemy, random);
  }
  g.phase = "combat";
  g = beginClash(g, random);
  const first = g.clashPlan!.preparer;
  for (let turn = 0; turn < 60 && g.phase === "combat"; turn++) {
    g = submitClash(g, simplePlayerPlan(g, random), {}, random);
    if (g.phase === "combat" && g.clashPlan?.stage === "reveal")
      g = submitClash(g, [], {}, random);
  }
  return { outcome: g.phase, hp: g.player.hp, rounds: g.round - 1, first };
}
