import { isGuard } from "@/game/combat/reaction-rules";
import { explainDamage } from "@/game/equipment/damage-explanation";
import { isEvade } from "@/game/skills/skills";
import type { Maneuver, Stats } from "@/game/types";

const number = (value: number) => value.toLocaleString("ru-RU");

export function figureEffects(figure: Maneuver, stats: Stats): string[] {
  const lines = explainDamage({ stats }, figure).map((part) => {
    const label = part.label.endsWith("ий")
      ? `${part.label} урон`
      : `Урон (${part.label.toLocaleLowerCase("ru-RU")})`;
    return `${label}${figure.counter ? " при контратаке" : ""}: ${part.formula}`;
  });
  if ((figure.staminaDamagePerCell ?? 0) > 0)
    lines.push(
      `Урон выносливости: ${number(figure.staminaDamagePerCell!)}×${figure.shape.length}`,
    );
  if ((figure.healing ?? 0) > 0)
    lines.push(`Восстановление здоровья: ${number(figure.healing!)} за фигуру`);
  if (isEvade(figure)) lines.push("Уклонение: весь входящий урон");
  else if (isGuard(figure)) lines.push("Блок: весь входящий урон");
  if (figure.ignoreBlocked) lines.push("Размещение: в том числе на камнях");

  const cost = figure.staminaCost ?? 0;
  const blockCost = figure.blockCost ?? 0;
  lines.push(
    blockCost > 0
      ? cost > 0
        ? `Цена: ${number(cost)} выносливости + ${number(blockCost)} за заблокированную клетку`
        : `Цена: ${number(blockCost)} выносливости за заблокированную клетку`
      : `Цена: ${number(cost)} выносливости`,
  );
  lines.push(`В колоде: ${figure.copies ?? 1}`);
  return lines;
}
