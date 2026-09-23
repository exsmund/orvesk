import { isEvade, skill } from "../skills/skills";
import { maxHp } from "./engine";
import {
  comboCandidates,
  groupCombos,
  type FigureCombo,
} from "./figure-combos";
import { maxPoise, poise } from "./tactics";
import { sideAdjacent } from "./battle-traits";
import { item } from "../equipment/catalog";
import { damageParts } from "./engine";
import { placementCells } from "./board";
import {
  reactionManeuvers,
  isStrike,
  isGuard,
  maneuverPoiseDamage,
} from "./reaction-rules";
import type {
  BoardModifiers,
  Fighter,
  Maneuver,
  Placement,
  PublicGame,
  Side,
  SpecialCell,
} from "../types";
export const attackParts = (f: Fighter, m: Maneuver) =>
  damageParts(
    { ...f, gear: { ...f.gear, weapon: m.weaponId ?? f.gear.weapon } },
    { action: m.action as "attack", step: 0 },
  ).map((part) => ({ ...part, value: part.value * (m.powerScale ?? 1) }));
export function layer(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
): Array<Maneuver | undefined> {
  const result: Array<Maneuver | undefined> = Array(9).fill(undefined),
    tokens = reactionManeuvers(f);
  for (const p of placed) {
    const m = tokens.find((m) => m.id === p.id)!;
    for (const cell of placementCells(m, p, mod)) result[cell] = m;
  }
  return result;
}
/** Distribute rounded tenths without losing or inventing health across cells. */
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

/** Shared by actual resolution and the public reaction preview. No state changes or random rolls. */
export function attackDamage(
  f: Fighter,
  d: Fighter,
  m: Maneuver,
  indices: number[],
  opposing: Array<Maneuver | undefined>,
  special?: SpecialCell,
  bonus = 0,
) {
  const base =
    indices.length === m.cellWeights?.length
      ? m.cellWeights
      : indices.map(() => 1 / indices.length);
  const original = base.reduce((a, b) => a + b, 0);
  const contact = indices.map(
    (n, i) =>
      (base[i] / original) *
      (isGuard(opposing[n]) || isEvade(opposing[n])
        ? 0
        : isStrike(opposing[n])
          ? d.archetype === "ghost"
            ? 0.75
            : 0.5
          : 1),
  );
  const poiseCoverage = contact.reduce((a, b) => a + b, 0);
  const weights = indices.map(
    (n, i) =>
      contact[i] *
      (special?.kind === "surge" &&
      indices.includes(special.index) &&
      (n === special.index || sideAdjacent(n, special.index))
        ? 1.25
        : 1),
  );
  const coverage = weights.reduce((a, b) => a + b, 0);
  const pierce =
    special?.kind === "pierce"
      ? (weights[indices.indexOf(special.index)] ?? 0)
      : 0;
  const armor = [d.gear.body, d.gear.feet]
      .filter(Boolean)
      .map((id) => item(id)),
    parts = attackParts(f, m);
  if (bonus && parts.length)
    parts[0] = { ...parts[0], value: parts[0].value + bonus };
  const blockedRaw =
    indices.reduce(
      (sum, n, i) =>
        sum +
        (isGuard(opposing[n]) || isEvade(opposing[n])
          ? (base[i] / original) *
            (special?.kind === "surge" &&
            indices.includes(special.index) &&
            (n === special.index || sideAdjacent(n, special.index))
              ? 1.25
              : 1)
          : 0),
      0,
    ) * parts.reduce((n, p) => n + p.value, 0);
  const amount = parts.reduce((sum, part) => {
    const flat = armor.reduce((n, a) => n + (a.defense?.[part.type] ?? 0), 0),
      penetration =
        part.type === "fire"
          ? Math.min(3, Math.floor(f.stats.intelligence / 3))
          : 0;
    const bypass = coverage ? Math.min(1, pierce / coverage) : 0;
    return (
      sum +
      Math.max(
        0,
        part.value * coverage - Math.max(0, flat - penetration) * (1 - bypass),
      ) *
        armor.reduce((n, a) => n * (1 - (a.resistance?.[part.type] ?? 0)), 1)
    );
  }, 0);
  const damage = Math.round(amount * 10) / 10;
  return {
    parts,
    coverage,
    poiseCoverage,
    damage,
    blockedRaw,
    shares: distributeDamage(damage, weights),
  };
}
export function healthDamage(hp: number, incoming: number[]) {
  const total = incoming.reduce((a, b) => a + b, 0),
    lost = Math.min(hp, Math.round(total * 10) / 10);
  return { lost, actual: distributeDamage(lost, incoming) };
}
export interface ClashSideSummary {
  hpBefore: number;
  hpAfter: number;
  damage: number;
  blocked: number;
  healed?: number;
  poiseBefore: number;
  poiseAfter: number;
  poiseLoss: number;
  poiseRecovered: number;
  prone: boolean;
  reasons: string[];
  combos: FigureCombo[];
}
export interface ClashCalculation {
  cells: { index: number; playerDamage: number; enemyDamage: number }[];
  playerDamage: number;
  enemyDamage: number;
  sides: Record<Side, ClashSideSummary>;
  attacks: Record<Side, Record<string, ReturnType<typeof attackDamage>>>;
}
/** One deterministic calculation for the server, previews and post-combat explanations. */
export function calculateClash(
  fighters: Record<Side, Fighter>,
  moves: Record<Side, Placement[]>,
  mods: Record<Side, BoardModifiers>,
  special?: SpecialCell,
): ClashCalculation {
  const sides = ["player", "enemy"] as const;
  const layers = {
    player: layer(fighters.player, moves.player, mods.player),
    enemy: layer(fighters.enemy, moves.enemy, mods.enemy),
  };
  const incoming: Record<Side, number[]> = {
    player: Array(9).fill(0),
    enemy: Array(9).fill(0),
  };
  const attacks: ClashCalculation["attacks"] = { player: {}, enemy: {} };
  const summaries = {} as ClashCalculation["sides"];
  const standing = {
    player: fighters.player.prone && moves.player.some((p) => p.id === "stand"),
    enemy: fighters.enemy.prone && moves.enemy.some((p) => p.id === "stand"),
  };
  const addPoiseLoss = (side: Side, loss: number, reason: string) => {
    if (standing[side] || loss <= 0) return;
    summaries[side].poiseLoss =
      Math.round((summaries[side].poiseLoss + loss) * 10) / 10;
    summaries[side].reasons.push(reason);
  };
  for (const side of sides) {
    const f = fighters[side];
    summaries[side] = {
      hpBefore: f.hp,
      hpAfter: f.hp,
      damage: 0,
      blocked: 0,
      poiseBefore: poise(f),
      poiseAfter: poise(f),
      poiseLoss: 0,
      poiseRecovered: 0,
      prone: f.prone,
      reasons: [],
      combos: [],
    };
  }
  for (const side of sides) {
    const target = side === "player" ? "enemy" : "player",
      f = fighters[side],
      d = fighters[target],
      tokens = reactionManeuvers(f);
    const candidates = comboCandidates(f, moves[side], mods[side]);
    const guarded = (c: FigureCombo) =>
      moves[side]
        .filter((p) => p.id === c.actionIds[1])
        .some((p) =>
          placementCells(
            tokens.find((m) => m.id === p.id)!,
            p,
            mods[side],
          ).some((n) => isStrike(layers[target][n])),
        );
    // Each adjacent dagger attack gets at most one bonus, even with several shields.
    const counters = groupCombos(
      candidates.filter(
        (c) =>
          c.kind === "counter" &&
          guarded(c) &&
          moves[side].some(
            (p) =>
              p.id === c.actionIds[0] &&
              placementCells(
                tokens.find((m) => m.id === p.id)!,
                p,
                mods[side],
              ).some(
                (n) =>
                  !isGuard(layers[target][n]) && !isEvade(layers[target][n]),
              ),
          ),
      ),
    );
    for (const p of moves[side]) {
      const m = tokens.find((m) => m.id === p.id)!;
      if (!isStrike(m)) continue;
      const indices = placementCells(m, p, mods[side]);
      const base = attackDamage(f, d, m, indices, layers[target], special),
        counter = counters.find((c) => c.actionIds[0] === p.id);
      const result =
        counter?.actionIds[0] === p.id
          ? attackDamage(f, d, m, indices, layers[target], special, 1)
          : base;
      attacks[side][p.id] = result;
      indices.forEach((n, i) => (incoming[target][n] += result.shares[i]));
      summaries[target].blocked += result.blockedRaw;
      if (result.damage > 0) {
        const full = maneuverPoiseDamage(f, m),
          loss = Math.round(full * result.poiseCoverage * 10) / 10;
        addPoiseLoss(
          target,
          loss,
          `${m.name}: −${loss.toLocaleString("ru-RU")} стойки (${full} × ${Math.round(result.poiseCoverage * 100)}% прошедшей атаки)`,
        );
      }
      if (counter?.actionIds[0] === p.id) {
        counter.damageBonus =
          Math.round((result.damage - base.damage) * 10) / 10;
        summaries[side].combos.push(counter);
      }
    }
    for (const kind of ["pressure", "support"] as const) {
      const combo = candidates.find(
        (c) =>
          c.kind === kind &&
          (attacks[side][c.actionIds[0]]?.damage ?? 0) > 0 &&
          (kind === "pressure"
            ? (attacks[side][c.actionIds[1]]?.damage ?? 0) > 0
            : guarded(c)),
      );
      if (combo && !(kind === "pressure" && standing[target])) {
        if (kind === "pressure") {
          combo.poiseBonus = 1;
          addPoiseLoss(target, 1, "Подсечка: −1 стойки");
        } else combo.recoveryBonus = 1;
        summaries[side].combos.push(combo);
      }
    }
    // Recoveries are independent of placement order and precede simultaneous poise damage.
    let recovery = 0;
    for (const p of moves[side]) {
      const m = tokens.find((m) => m.id === p.id)!,
        indices = placementCells(m, p, mods[side]);
      if (isGuard(m)) {
        if (
          indices.some(
            (n) =>
              !isStrike(layers[target][n]) &&
              !isGuard(layers[target][n]) &&
              !isEvade(layers[target][n]),
          )
        ) {
          addPoiseLoss(target, 1, `${m.name} на пустоте: −1 стойки`);
        }
        if (special?.kind === "rally" && indices.includes(special.index)) {
          recovery += 2;
          summaries[side].reasons.push("Опора на поле: до +2 стойки");
        }
        if (
          f.archetype === "warden" &&
          indices.every((n) => !isStrike(layers[target][n]))
        ) {
          recovery++;
          summaries[side].reasons.push("Страж: до +1 стойки");
        }
      }
      const ability = m.skillId ? skill(m.skillId) : undefined;
      if (ability?.effect === "poise") {
        recovery += ability.amount;
        summaries[side].reasons.push(`${m.name}: до +${ability.amount} стойки`);
      }
      if (isEvade(m))
        summaries[side].reasons.push(
          `${m.name}: урон здоровью и стойке в перекрытых клетках отменён`,
        );
      if (m.action === "rest") {
        recovery += 2;
        summaries[side].reasons.push("Передышка: до +2 стойки");
      }
      if (m.action === "stand") {
        summaries[side].prone = false;
        summaries[side].reasons.push(
          "Подъём: полное восстановление и защита от потери стойки на этот раунд; урон здоровью сохраняется",
        );
      }
    }
    // Count enemy figures, not cells or defending blocks. Several blocks may cover one attack.
    const shield = f.gear.shield ? item(f.gear.shield) : undefined;
    if (shield?.fullBlockPoiseRecovery) {
      const enemyTokens = reactionManeuvers(d);
      for (const attack of moves[target]) {
        const m = enemyTokens.find((m) => m.id === attack.id)!;
        if (!isStrike(m)) continue;
        const cells = placementCells(m, attack, mods[target]);
        if (
          cells.length &&
          cells.every(
            (n) =>
              isGuard(layers[side][n]) &&
              layers[side][n]?.shieldId === shield.id,
          )
        ) {
          recovery += shield.fullBlockPoiseRecovery;
          summaries[side].reasons.push(
            `${shield.name}: полностью перекрыта фигура «${m.name}» — до +${shield.fullBlockPoiseRecovery} стойки`,
          );
        }
      }
    }
    if (summaries[side].combos.some((c) => c.kind === "support")) {
      recovery++;
      summaries[side].reasons.push("Опора меча: до +1 стойки");
    }
    const afterRecovery = standing[side]
      ? maxPoise(f)
      : Math.min(maxPoise(f), poise(f) + recovery);
    summaries[side].poiseRecovered =
      Math.round((afterRecovery - poise(f)) * 10) / 10;
    summaries[side].poiseAfter = afterRecovery;
  }
  const health = {
    player: healthDamage(fighters.player.hp, incoming.player),
    enemy: healthDamage(fighters.enemy.hp, incoming.enemy),
  };
  for (const side of sides) {
    const s = summaries[side];
    s.damage = health[side].lost;
    s.hpAfter = Math.max(0, Math.round((s.hpBefore - s.damage) * 10) / 10);
    s.blocked = Math.round(s.blocked * 10) / 10;
    s.poiseAfter = Math.max(
      0,
      Math.round((s.poiseAfter - s.poiseLoss) * 10) / 10,
    );
    s.prone = s.prone || s.poiseAfter === 0;
  }
  for (const side of sides) {
    const s = summaries[side];
    const healing = moves[side].reduce((n, p) => {
      const m = reactionManeuvers(fighters[side]).find((m) => m.id === p.id),
        ability = m?.skillId ? skill(m.skillId) : undefined;
      return n + (ability?.effect === "heal" ? ability.amount : 0);
    }, 0);
    if (healing && s.hpAfter > 0) {
      s.healed = Math.max(
        0,
        Math.min(healing, maxHp(fighters[side]) - s.hpAfter),
      );
      s.hpAfter = Math.round((s.hpAfter + s.healed) * 10) / 10;
      s.reasons.push(`Перевязка: +${s.healed} здоровья после урона`);
    }
  }
  return {
    cells: Array.from({ length: 9 }, (_, index) => ({
      index,
      playerDamage: health.player.actual[index],
      enemyDamage: health.enemy.actual[index],
    })),
    playerDamage: health.player.lost,
    enemyDamage: health.enemy.lost,
    sides: summaries,
    attacks,
  };
}
export function previewClashDamage(
  game: PublicGame,
  placed: Placement[],
  mod: BoardModifiers = {},
) {
  const plan = game.clash;
  if (
    !plan ||
    plan.stage !== "reaction" ||
    plan.preparer !== "enemy" ||
    !plan.enemyPlaced
  )
    return null;
  return calculateClash(
    game,
    { player: placed, enemy: plan.enemyPlaced },
    { player: mod, enemy: plan.enemyModifiers ?? {} },
    plan.special,
  );
}

/** Preparation shows attack potential only: the hidden response must never be read. */
export function preparationDamage(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers = {},
  special?: SpecialCell,
) {
  const tokens = reactionManeuvers(f),
    potential = Array(9).fill(0) as number[],
    conditional = Array(9).fill(0) as number[];
  const candidates = comboCandidates(f, placed, mod);
  const undefended = { ...f, gear: { ...f.gear, body: null, feet: null } };
  for (const p of placed) {
    const m = tokens.find((m) => m.id === p.id)!;
    if (!isStrike(m)) continue;
    const indices = placementCells(m, p, mod),
      base = attackDamage(
        f,
        undefended,
        m,
        indices,
        Array(9).fill(undefined),
        special,
      );
    const withBonus = candidates.some(
      (c) => c.kind === "counter" && c.actionIds[0] === p.id,
    )
      ? attackDamage(
          f,
          undefended,
          m,
          indices,
          Array(9).fill(undefined),
          special,
          1,
        )
      : base;
    indices.forEach((n, i) => {
      potential[n] = base.shares[i];
      conditional[n] =
        Math.round((withBonus.shares[i] - base.shares[i]) * 10) / 10;
    });
  }
  return { potential, conditional };
}
