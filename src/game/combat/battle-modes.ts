import type { BattleMode, Fighter, Journey, Maneuver } from "../types";

export const BATTLE_MODES: Record<
  BattleMode,
  { name: string; description: string }
> = {
  limited: {
    name: "Тактика",
    description:
      "Фигуры возвращаются каждый раунд с учётом восстановления. Подготовка — до 5 клеток, реакция — до 4. Потеря равновесия уменьшает лимит, усиленный противник получает дополнительную клетку.",
  },
  free: {
    name: "Свободное поле",
    description:
      "Лимита клеток и числа фигур за ход нет: размещайте всё, что помещается на поле. Каждую фигуру можно разместить один раз за раунд. Фигуры возвращаются с учётом восстановления.",
  },
  expendable: {
    name: "Единственный шанс",
    description:
      "Каждая фигура используется один раз за бой, включая навыки, блоки и передышку. Лимита клеток и числа фигур за ход нет: главное — поместиться на поле. Можно завершить свои действия досрочно; противник разыграет оставшиеся фигуры. Когда у обеих сторон больше нет действий, способных изменить здоровье, побеждает тот, у кого больше единиц здоровья (не процентов). При равенстве — ничья. Нокаут завершает бой сразу. Перед новым противником все фигуры восстанавливаются.",
  },
};
export const battleMode = (journey?: Journey): BattleMode =>
  journey?.battleMode ?? "limited";
export function chooseBattleMode(
  random: () => number,
  previous?: BattleMode,
): BattleMode {
  const choices = (Object.keys(BATTLE_MODES) as BattleMode[]).filter(
    (mode) => mode !== previous,
  );
  return choices[Math.floor(random() * choices.length)];
}
/** Source identity survives equipment changes: returning to an old weapon never refreshes it. */
export const figureKey = (m: Maneuver) =>
  `${m.skillId ?? m.weaponId ?? m.shieldId ?? "base"}:${m.id}`;
export function withFigureAvailability(f: Fighter, m: Maneuver): Maneuver {
  if (f.battleMode !== "expendable" || m.action === "stand") return m;
  return {
    ...m,
    cooldown: 0,
    spent: !!f.spentFigures?.includes(figureKey(m)),
    description:
      m.description.replace(" После использования недоступен один раунд.", "") +
      " Один раз за бой.",
  };
}
