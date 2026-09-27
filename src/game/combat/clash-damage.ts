import BALANCE from "../../../data/combat-balance.json";
import { isEvade } from "@/game/skills/skills";
import { maxHp } from "@/game/combat/engine";
import { stamina } from "@/game/combat/tactics";
import { placementCells } from "@/game/combat/board";
import {
  reactionManeuvers,
  isStrike,
  isGuard,
} from "@/game/combat/reaction-rules";
import {
  figureCellParts,
  armorRating,
  mitigate,
} from "@/game/combat/figure-power";
import type {
  BoardModifiers,
  ClashResult,
  Fighter,
  Maneuver,
  Placement,
  PublicGame,
  Side,
} from "@/game/types";
export const attackParts = (f: Fighter, m: Maneuver) =>
  figureCellParts(f, m).map((p) => ({ ...p, value: p.value * m.shape.length }));
export function layer(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
): Array<Maneuver | undefined> {
  const result: Array<Maneuver | undefined> = Array(9).fill(undefined);
  for (const p of placed) {
    const m = reactionManeuvers(f).find((m) => m.id === p.id);
    if (m) for (const cell of placementCells(m, p, mod)) result[cell] = m;
  }
  return result;
}
export function distributeDamage(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0),
    units = Math.round(total * 10);
  if (!sum || !units) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * units),
    result = exact.map(Math.floor);
  let spare = units - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((n, i) => ({ i, r: n - result[i] }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (spare-- <= 0) break;
    result[i]++;
  }
  return result.map((n) => n / 10);
}

export function healthDamage(hp: number, incoming: number[]) {
  const lost = Math.min(
    hp,
    Math.round(incoming.reduce((a, b) => a + b, 0) * 10) / 10,
  );
  return { lost, actual: distributeDamage(lost, incoming) };
}
const contact = (m: Maneuver, opposing?: Maneuver) =>
  m.counter
    ? isStrike(opposing)
      ? 1
      : 0
    : isGuard(opposing) || isEvade(opposing)
      ? 0
      : isStrike(opposing)
        ? 0.5
        : 1;

function staminaDamageByCell(
  attackers: Array<Maneuver | undefined>,
  defenders: Array<Maneuver | undefined>,
) {
  const sizes = new Map<string, number>();
  for (const m of attackers) if (m) sizes.set(m.id, (sizes.get(m.id) ?? 0) + 1);
  return attackers.map((m, index) =>
    m && (isStrike(m) || m.counter)
      ? (m.staminaDamagePerCell ?? 0) *
        (m.shape.length / sizes.get(m.id)!) *
        contact(m, defenders[index])
      : 0,
  );
}

/** Older results keep the figures and total loss, enough to recover cell shares. */
export function clashResultCells(result: ClashResult) {
  const player = result.cells.map((cell) => cell.player);
  const enemy = result.cells.map((cell) => cell.enemy);
  const playerStamina = distributeDamage(
    result.playerStaminaLoss,
    staminaDamageByCell(enemy, player),
  );
  const enemyStamina = distributeDamage(
    result.enemyStaminaLoss,
    staminaDamageByCell(player, enemy),
  );
  return result.cells.map((cell, index) => ({
    ...cell,
    playerStaminaDamage: cell.playerStaminaDamage ?? playerStamina[index],
    enemyStaminaDamage: cell.enemyStaminaDamage ?? enemyStamina[index],
  }));
}
export function attackDamage(
  f: Fighter,
  d: Fighter,
  m: Maneuver,
  indices: number[],
  opposing: Array<Maneuver | undefined>,
) {
  const parts = figureCellParts(f, m);
  const weights: number[] = indices.map((n) => contact(m, opposing[n]));
  const concentration = m.shape.length / indices.length;
  const shares = weights.map((w) =>
    parts.reduce(
      (sum, p) =>
        sum + mitigate(p.value, armorRating(d, p.type)) * w * concentration,
      0,
    ),
  );
  return {
    parts,
    coverage: weights.reduce((a, b) => a + b, 0) / indices.length,
    staminaCoverage: weights.reduce((a, b) => a + b, 0) / indices.length,
    blockStaminaDamage: 0,
    damage: shares.reduce((a, b) => a + b, 0),
    blockedRaw: 0,
    shares,
  };
}
/** Cost is reserved before damage. A blind first move reserves every guard cell. */
export function placementCost(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
  opposing?: Array<Maneuver | undefined>,
) {
  let attacks = 0,
    blocks = 0;
  for (const p of placed) {
    const m = reactionManeuvers(f).find((m) => m.id === p.id);
    if (!m) continue;
    attacks += m.staminaCost ?? 0;
    if (m.blockCost)
      blocks +=
        placementCells(m, p, mod).filter(
          (n) => !opposing || isStrike(opposing[n]),
        ).length * m.blockCost;
  }
  return {
    attacks,
    blocks,
    total: attacks + blocks,
    remaining: stamina(f) - attacks - blocks,
  };
}
export interface ClashSideSummary {
  hpBefore: number;
  hpAfter: number;
  damage: number;
  blocked: number;
  healed?: number;
  staminaBefore: number;
  staminaAfter: number;
  staminaLoss: number;
  staminaRecovered: number;
  cost: number;
  attackCost: number;
  blockCost: number;
  available: number;
  exhausted: boolean;
}
export function calculateClash(
  fighters: Record<Side, Fighter>,
  moves: Record<Side, Placement[]>,
  mods: Record<Side, BoardModifiers>,
) {
  const sides = ["player", "enemy"] as const;
  const layers = {
    player: layer(fighters.player, moves.player, mods.player),
    enemy: layer(fighters.enemy, moves.enemy, mods.enemy),
  };
  const incoming = {
    player: Array(9).fill(0) as number[],
    enemy: Array(9).fill(0) as number[],
  };
  const incomingStamina = {
    player: staminaDamageByCell(layers.enemy, layers.player),
    enemy: staminaDamageByCell(layers.player, layers.enemy),
  };
  const attacks: Record<
    Side,
    Record<string, ReturnType<typeof attackDamage>>
  > = { player: {}, enemy: {} };
  for (const side of sides) {
    const target = side === "player" ? "enemy" : "player";
    for (const p of moves[side]) {
      const m = reactionManeuvers(fighters[side]).find((m) => m.id === p.id);
      if (!m || (!isStrike(m) && !m.counter)) continue;
      const indices = placementCells(m, p, mods[side]);
      const a = attackDamage(
        fighters[side],
        fighters[target],
        m,
        indices,
        layers[target],
      );
      attacks[side][p.id] = a;
      indices.forEach((n, i) => {
        incoming[target][n] += a.shares[i];
      });
    }
  }
  const health = {
    player: healthDamage(fighters.player.hp, incoming.player),
    enemy: healthDamage(fighters.enemy.hp, incoming.enemy),
  };
  const summaries = {} as Record<Side, ClashSideSummary>;
  for (const side of sides) {
    const f = fighters[side];
    const target = side === "player" ? "enemy" : "player";
    const cost = placementCost(f, moves[side], mods[side], layers[target]);
    let hpAfter = Math.max(0, Math.round((f.hp - health[side].lost) * 10) / 10);
    const healing = moves[side].reduce(
      (sum, p) =>
        sum + (reactionManeuvers(f).find((m) => m.id === p.id)?.healing ?? 0),
      0,
    );
    const healed = hpAfter > 0 ? Math.min(healing, maxHp(f) - hpAfter) : 0;
    hpAfter += healed;
    const staminaDamage = incomingStamina[side].reduce((sum, n) => sum + n, 0);
    const loss = Math.min(Math.max(0, cost.remaining), staminaDamage);
    const exhausted = staminaDamage > 0 && cost.remaining - staminaDamage <= 0;
    const resting = !moves[side].length && hpAfter > 0;
    summaries[side] = {
      hpBefore: f.hp,
      hpAfter,
      damage: health[side].lost,
      blocked: 0,
      healed,
      staminaBefore: stamina(f),
      staminaAfter: resting
        ? BALANCE.stamina.max
        : Math.max(0, cost.remaining - loss),
      staminaLoss: loss,
      staminaRecovered: resting
        ? BALANCE.stamina.max - Math.max(0, cost.remaining - loss)
        : 0,
      cost: cost.total,
      attackCost: cost.attacks,
      blockCost: cost.blocks,
      available: cost.remaining,
      exhausted: exhausted && !resting,
    };
  }
  const staminaLoss = {
    player: distributeDamage(
      summaries.player.staminaLoss,
      incomingStamina.player,
    ),
    enemy: distributeDamage(summaries.enemy.staminaLoss, incomingStamina.enemy),
  };
  return {
    sides: summaries,
    attacks,
    playerDamage: health.player.lost,
    enemyDamage: health.enemy.lost,
    cells: Array.from({ length: 9 }, (_, index) => ({
      index,
      playerDamage: health.player.actual[index],
      enemyDamage: health.enemy.actual[index],
      playerStaminaDamage: staminaLoss.player[index],
      enemyStaminaDamage: staminaLoss.enemy[index],
    })),
  };
}
export function previewClashDamage(
  game: PublicGame,
  placed: Placement[],
  mod: BoardModifiers = {},
) {
  const plan = game.clash;
  if (!plan?.enemyPlaced) return null;
  return calculateClash(
    game,
    { player: placed, enemy: plan.enemyPlaced },
    { player: mod, enemy: plan.enemyModifiers ?? {} },
  );
}
export function preparationDamage(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers = {},
) {
  const potential = Array(9).fill(0) as number[];
  for (const p of placed) {
    const m = reactionManeuvers(f).find((m) => m.id === p.id);
    if (!m || !isStrike(m)) continue;
    const value = figureCellParts(f, m).reduce((sum, p) => sum + p.value, 0);
    const cells = placementCells(m, p, mod);
    for (const n of cells)
      potential[n] = (value * m.shape.length) / cells.length;
  }
  return {
    potential,
    stamina: staminaDamageByCell(layer(f, placed, mod), []),
  };
}

export type ClashCalculation = ReturnType<typeof calculateClash>;
