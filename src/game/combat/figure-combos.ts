import { sideAdjacent } from "./battle-traits";
import { placementCells } from "./board";
import { isGuard, reactionManeuvers } from "./reaction-rules";
import type { BoardModifiers, Fighter, Item, Placement } from "../types";

export const COMBOS = {
  counter: {
    name: "Контратака",
    weapon: "dagger",
    description:
      "Каждый удар кинжалом (включая «Иней» и сильный удар) рядом по стороне с блоком щитом получает +1 колющего урона до перекрытий и брони, если этот щит перекрыл атаку. Несколько щитов не умножают бонус одного удара.",
  },
  pressure: {
    name: "Подсечка",
    weapon: "axe",
    description:
      "Удар топора рядом по стороне с пинком: если обе фигуры нанесли урон здоровью, противник теряет ещё 1 стойки.",
  },
  support: {
    name: "Опора",
    weapon: "shortsword",
    description:
      "Удар меча дозорного рядом по стороне с блоком щитом: если меч нанёс урон здоровью, а щит перекрыл атаку, восстановите 1 стойки перед входящим уроном стойке.",
  },
} as const;
export type ComboKind = keyof typeof COMBOS;
export interface FigureCombo {
  kind: ComboKind;
  name: string;
  actionIds: string[];
  cells: number[];
  links: [number, number][];
  /** Actual extra health damage after armor/overlap, before remaining-HP cap. */
  damageBonus: number;
  poiseBonus: number;
  recoveryBonus: number;
}
type ComboRule = (typeof COMBOS)[ComboKind];
function weaponCombo(id: string): ComboRule | undefined {
  return ["dagger", "frost-dagger"].includes(id)
    ? COMBOS.counter
    : Object.values(COMBOS).find((c) => c.weapon === id);
}
/** Both participants expose the same rules in item inspection, including every shield. */
export function itemComboRules(equipment: Item): ComboRule[] {
  if (equipment.kind === "shield") return [COMBOS.counter, COMBOS.support];
  const rule = weaponCombo(equipment.id);
  return rule ? [rule] : [];
}
export function comboRuleDescription(rule: ComboRule) {
  return `${rule.description} ${rule === COMBOS.counter ? "Один раз на каждую фигуру атаки за ход" : "Один раз за ход"}; диагональ не считается.`;
}
export function itemComboDescription(id: string) {
  const rule = weaponCombo(id);
  return rule ? `${rule.name}: ${comboRuleDescription(rule)}` : undefined;
}
/** Stable token order makes the choice independent of the order of placement. */
export function comboCandidates(
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
): FigureCombo[] {
  if (!f.tactical || f.prone) return [];
  const tokens = reactionManeuvers(f);
  const entries = tokens.flatMap((m) => {
    const p = placed.find((p) => p.id === m.id);
    return p ? [{ m, cells: placementCells(m, p, mod) }] : [];
  });
  const result: FigureCombo[] = [];
  for (const [kind, rule] of Object.entries(COMBOS) as [
    ComboKind,
    (typeof COMBOS)[ComboKind],
  ][]) {
    for (const a of entries.filter(({ m }) =>
      kind === "counter"
        ? ["dagger", "frost-dagger"].includes(m.weaponId ?? "") &&
          ["attack", "heavy"].includes(m.action)
        : m.weaponId === rule.weapon,
    )) {
      for (const b of entries.filter(({ m }) =>
        kind === "pressure" ? m.action === "kick" : isGuard(m) && !!m.shieldId,
      )) {
        const links = a.cells.flatMap((x) =>
          b.cells
            .filter((y) => sideAdjacent(x, y))
            .map((y) => [x, y] as [number, number]),
        );
        if (links.length)
          result.push({
            kind,
            name: rule.name,
            actionIds: [a.m.id, b.m.id],
            cells: [...a.cells, ...b.cells],
            links,
            damageBonus: 0,
            poiseBonus: 0,
            recoveryBonus: 0,
          });
      }
    }
  }
  return result;
}

/** Merge supporting shields per attack, keeping every link but granting only one bonus. */
export function groupCombos(candidates: FigureCombo[]): FigureCombo[] {
  const grouped: FigureCombo[] = [];
  for (const c of candidates) {
    const existing = grouped.find(
      (x) =>
        x.kind === c.kind &&
        (c.kind !== "counter" || x.actionIds[0] === c.actionIds[0]),
    );
    if (existing) {
      if (c.kind === "counter") {
        existing.actionIds = [
          ...new Set([...existing.actionIds, ...c.actionIds]),
        ];
        existing.cells = [...new Set([...existing.cells, ...c.cells])];
        existing.links.push(...c.links);
      }
    } else
      grouped.push({
        ...c,
        actionIds: [...c.actionIds],
        cells: [...c.cells],
        links: [...c.links],
      });
  }
  return grouped;
}
