import type { Cell, Fighter, Maneuver } from "../types";
export const MAX_SKILLS = 3;
export type SkillId = "dodge" | "sidestep" | "composure" | "bandage";
export interface Skill {
  id: SkillId;
  name: string;
  shape: Cell[];
  effect: "evade" | "poise" | "heal";
  amount: number;
  description: string;
}
export const SKILLS: Skill[] = [
  {
    id: "dodge",
    name: "Уворот",
    shape: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    effect: "evade",
    amount: 0,
    description:
      "Избежать всего урона здоровью и стойке в четырёх перекрытых клетках. Не считается блоком щита, не давит на противника и не активирует комбинации щита.",
  },
  {
    id: "sidestep",
    name: "Шаг в сторону",
    shape: [
      [0, 0],
      [1, 1],
    ],
    effect: "evade",
    amount: 0,
    description:
      "Избежать всего урона здоровью и стойке в двух клетках по диагонали. Не считается блоком щита и не активирует его комбинации.",
  },
  {
    id: "composure",
    name: "Собраться",
    shape: [
      [0, 0],
      [1, 0],
    ],
    effect: "poise",
    amount: 3,
    description:
      "Восстановить до 3 стойки перед входящим уроном, не выше максимума. Не защищает от атак.",
  },
  {
    id: "bandage",
    name: "Перевязка",
    shape: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    effect: "heal",
    amount: 2,
    description:
      "Восстановить до 2 здоровья после подсчёта урона, если вы выжили. Не выше максимума; не защищает от атак и не воскрешает.",
  },
];
export const skill = (id: string) => SKILLS.find((s) => s.id === id);
export const knownSkills = (f: Pick<Fighter, "skills">) =>
  SKILLS.filter((s) => f.skills?.includes(s.id));
export function skillManeuver(s: Skill, f?: Fighter): Maneuver {
  const id = `skill:${s.id}`;
  return {
    id,
    skillId: s.id,
    name: s.name,
    action: "skill",
    shape: s.shape.map(([x, y]) => [x, y]),
    description: s.description + " После использования недоступен один раунд.",
    cooldownKey: id,
    cooldown: f?.cooldowns?.[id] ?? 0,
  };
}
export const isEvade = (m?: Maneuver) =>
  !!m?.skillId && skill(m.skillId)?.effect === "evade";
/** Only a reward selected by the authoritative server may add a skill. */
export function learnSkill(
  f: Fighter,
  id: SkillId,
  replace?: string,
  slot?: number,
) {
  if (!skill(id)) throw new Error("Неизвестный навык.");
  const current = [...(f.skills ?? [])];
  if (current.includes(id)) throw new Error("Этот навык уже изучен.");
  let index: number;
  if (slot !== undefined) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_SKILLS)
      throw new Error("Выберите ячейку навыка.");
    index = slot;
    if ((current[index] ?? undefined) !== replace)
      throw new Error("Содержимое ячейки изменилось. Выберите её заново.");
  } else if (replace !== undefined) {
    index = current.indexOf(replace as SkillId);
    if (index < 0) throw new Error("Выберите имеющийся навык для замены.");
  } else {
    index = current.findIndex((value) => !value);
    if (index < 0) index = current.length;
    if (index >= MAX_SKILLS)
      throw new Error(
        "Можно иметь не больше трёх навыков. Выберите навык для замены.",
      );
  }
  const removed = current[index];
  if (removed && f.cooldowns) delete f.cooldowns[`skill:${removed}`];
  while (current.length <= index) current.push(null);
  current[index] = id;
  f.skills = current;
}
