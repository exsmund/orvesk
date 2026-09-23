import { withFigureAvailability } from "./battle-modes";
import { knownSkills, skillManeuver } from "../skills/skills";
import { item } from "../equipment/catalog";
import { attackPower, damageParts } from "./engine";
import { maneuvers, placementCells } from "./board";
import type {
  BoardModifiers,
  Fighter,
  Item,
  Maneuver,
  Placement,
} from "../types";
export const isStrike = (m?: Maneuver) =>
  !!m && ["attack", "heavy", "kick", "shield"].includes(m.action);
export const isGuard = (m?: Maneuver) => m?.action === "block";
export function reactionManeuvers(f: Fighter): Maneuver[] {
  const base = maneuvers(f);
  if (f.tactical && !f.prone) {
    const w = item(f.gear.weapon);
    if (f.archetype === "duelist") {
      const strike = base.find((m) => m.id === "strike-1")!;
      strike.shape = [[0, 0]];
      strike.name = "Выпад I";
      if (!base.some((m) => m.id === "strike-2"))
        base.splice(1, 0, { ...strike, id: "strike-2", name: "Выпад II" });
    }
    if (w.id === "staff" && f.archetype !== "duelist") {
      const strike = base.find((m) => m.id === "strike-1")!;
      strike.shape = [
        [0, 0],
        [1, 0],
        [2, 0],
      ];
      strike.name = "Луч";
      strike.choiceGroup = "spell";
      base.splice(1, 0, {
        ...strike,
        id: "spell-arc",
        name: "Дуга",
        shape: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      });
    }
    if (f.gear.shield) {
      const guard = base.find((m) => m.id === "guard")!;
      guard.shape = [
        [0, 0],
        [1, 0],
      ];
      base.push({
        ...guard,
        id: "fortify",
        name: "Усиленный блок",
        shape:
          f.gear.shield === "buckler"
            ? [
                [0, 0],
                [1, 0],
              ]
            : [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
              ],
      });
      if (f.gear.shield === "buckler" && f.splitBuckler !== false) {
        guard.shape = [[0, 0]];
        guard.name = "Блок I";
        base.splice(base.indexOf(guard) + 1, 0, {
          ...guard,
          id: "guard-2",
          name: "Блок II",
        });
      }
    }
  }
  return base
    .filter((m) => !["advance", "retreat", "parry"].includes(m.action))
    .map<Maneuver>((m) => {
      const ignoreBlocked =
        !!m.weaponId && item(m.weaponId).ignoreBlocked === true;
      const description =
        m.action === "block"
          ? "Перекрытая клетка атаки не наносит урона. Блок на пустоте: −1 стойки за всю фигуру; при подъёме цели — 0."
          : m.action === "kick"
            ? "Урон силы, разделённый между клетками. Прошедший пинок дополнительно снижает стойку."
            : m.action === "shield"
              ? "Атака щитом: сила + 1, разделённая между клетками."
              : m.action === "rest"
                ? "Восстановить 2 стойки при одновременном подсчёте. Не защищает от атаки."
                : m.action === "equip"
                  ? "Подобрать предмет после подсчёта. Его фигуры появятся в следующем раунде."
                  : m.action === "stand"
                    ? "Встать, полностью восстановить стойку и защитить её от потери на этот раунд. Урон здоровью сохраняется. Других фигур нет."
                    : `${m.action === "heavy" ? "Урон ×1,5. " : ""}Урон делится между клетками. Оружие на оружии: половина урона каждому.${ignoreBlocked ? " Можно размещать на скалах." : ""}`;
      const shield = m.shieldId ? item(m.shieldId) : undefined;
      const recoveryText =
        isGuard(m) && shield?.fullBlockPoiseRecovery
          ? ` Полный блок: +${shield.fullBlockPoiseRecovery} стойки за каждую целиком перекрытую фигуру атаки. Без ограничения срабатываний за раунд, до максимума; восстановление перед входящим уроном стойке.`
          : "";
      if (!f.tactical)
        return { ...m, description: description + recoveryText, ignoreBlocked };
      const w = m.weaponId,
        weighted = isStrike(m) && m.action !== "kick" && m.action !== "shield";
      const focused =
        weighted &&
        m.shape.length > 1 &&
        (w === "axe" || (f.archetype === "crusher" && m.action === "heavy"));
      const cellWeights = focused
        ? m.shape.map((_, i) => (i === 0 ? 0.6 : 0.4 / (m.shape.length - 1)))
        : weighted && w === "spear" && m.shape.length > 1
          ? m.shape.map((_, i) =>
              i === m.shape.length - 1 ? 0.6 : 0.4 / (m.shape.length - 1),
            )
          : undefined;
      const cooldownKey =
        m.action === "heavy"
          ? "heavy"
          : m.id === "fortify"
            ? "fortify"
            : undefined;
      const powerScale = weighted && w === "hammer" ? 0.6 : undefined,
        poiseDamage =
          weighted && w === "hammer"
            ? m.action === "heavy"
              ? 4
              : 3
            : undefined;
      let detail = (description + recoveryText).replace(
        "Урон делится между клетками.",
        "Урон распределён по клеткам фигуры.",
      );
      if (cellWeights)
        detail += " Отмеченная клетка несёт 60% урона, остальные делят 40%.";
      if (powerScale)
        detail +=
          " Молот: 60% урона здоровью, " +
          poiseDamage +
          " урона стойке при полном попадании; частичное перекрытие уменьшает урон стойке.";
      if (m.choiceGroup)
        detail += " Выберите только один рисунок обычного заклинания за раунд.";
      if (cooldownKey) detail += " После использования недоступен один раунд.";
      return {
        ...m,
        description: detail,
        ignoreBlocked:
          ignoreBlocked || (f.archetype === "ghost" && isStrike(m)),
        cellWeights,
        powerScale,
        poiseDamage,
        cooldownKey,
        cooldown: cooldownKey ? (f.cooldowns?.[cooldownKey] ?? 0) : 0,
      };
    })
    .concat(f.prone ? [] : knownSkills(f).map((s) => skillManeuver(s, f)))
    .map((m) => withFigureAvailability(f, m));
}
/** Item inspection lists the item's own figures even if requirements are not yet met. */
export function itemManeuvers(equipment: Item, f: Fighter): Maneuver[] {
  if (equipment.kind !== "weapon" && equipment.kind !== "shield") return [];
  const preview = {
    ...f,
    prone: false,
    cooldowns: {},
    gear: { ...f.gear, [equipment.slot]: equipment.id },
  };
  if (equipment.kind === "weapon" && equipment.hands === 2)
    preview.gear.shield = null;
  if (equipment.kind === "shield" && item(preview.gear.weapon).hands === 2)
    preview.gear.weapon = null;
  return reactionManeuvers(preview).filter((m) =>
    equipment.kind === "weapon"
      ? m.weaponId === equipment.id
      : m.shieldId === equipment.id,
  );
}
export const usedCells = (
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
) =>
  placed.reduce(
    (n, p) =>
      n +
      placementCells(
        reactionManeuvers(f).find((m) => m.id === p.id)!,
        p,
        mod,
      ).length,
    0,
  );

/** Whole-figure damage before overlap and armor; uses the acting fighter's stats. */
export function maneuverDamage(f: Fighter, m: Maneuver): number {
  if (!isStrike(m)) return 0;
  return (
    Math.round(
      attackPower(
        { ...f, gear: { ...f.gear, weapon: m.weaponId ?? f.gear.weapon } },
        { action: m.action as "attack" | "heavy" | "kick" | "shield", step: 0 },
      ) *
        (m.powerScale ?? 1) *
        10,
    ) / 10
  );
}

/** Maximum poise lost per whole figure before overlap, conditional on health damage (or a guard on empty space). */
export function maneuverPoiseDamage(f: Fighter, m: Maneuver): number {
  if (isGuard(m)) return 1;
  if (!isStrike(m)) return 0;
  const parts = damageParts(
    { ...f, gear: { ...f.gear, weapon: m.weaponId ?? f.gear.weapon } },
    { action: m.action as "attack", step: 0 },
  );
  return (
    (m.poiseDamage ??
      (m.action === "kick"
        ? 2
        : m.action === "heavy" || m.action === "shield"
          ? 1
          : 0)) +
    (f.archetype === "crusher" && m.action === "heavy" ? 1 : 0) +
    (parts.some((p) => p.type === "magic") ? 1 : 0)
  );
}
