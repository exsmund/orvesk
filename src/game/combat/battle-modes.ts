import type { BattleMode, Journey } from "@/game/types";

export const BATTLE_MODES: Record<
  BattleMode,
  { name: string; description: string }
> = {
  free: {
    name: "Свободное поле",
    description:
      "Лимита клеток и числа фигур за ход нет: размещайте всё, что помещается на поле. Набор из четырёх карт. После хода использованные карты уходят в сброс и заменяются новыми. Сброс перемешивается, когда стопка заканчивается. Выносливость: 8, восстановление +2 за ход. Пропуск хода полностью восстанавливает выносливость после атак противника.",
  },
  expendable: {
    name: "Единственный шанс",
    description:
      "Карты из колоды используются один раз за бой. Сброс повторно не перемешивается. Лимита клеток и числа фигур за ход нет: главное — поместиться на поле. Можно завершить свои действия досрочно; противник разыграет оставшиеся фигуры. Когда у обеих сторон больше нет действий, способных изменить здоровье, побеждает тот, у кого больше единиц здоровья (не процентов). При равенстве — ничья. Нокаут завершает бой сразу. Перед новым боем собирается полная колода.",
  },
};
export const battleMode = (journey?: Journey): BattleMode =>
  journey?.battleMode ?? "free";
export function chooseBattleMode(
  random: () => number,
  previous?: BattleMode,
): BattleMode {
  const choices = (Object.keys(BATTLE_MODES) as BattleMode[]).filter(
    (mode) => mode !== previous,
  );
  return choices[Math.floor(random() * choices.length)];
}
