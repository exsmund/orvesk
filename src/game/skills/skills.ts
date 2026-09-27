import definitions from "../../../data/skills.json";
import type { Cell, Fighter, Maneuver } from "@/game/types";
export const MAX_SKILLS = 3;
export type SkillId = string;
export interface Skill {
  id: SkillId;
  figure?: Maneuver;
  art: string;
  deckMultiplier?: { category: "attack" | "defense"; factor: number };
  name: string;
  shape: Cell[];
  effect: "evade" | "heal" | "passive";
  amount: number;
  description: string;
}
export const SKILLS = definitions.map((s) => ({
  ...s,
  shape: s.figure?.shape ?? [],
})) as Skill[];
export const skill = (id: string) => SKILLS.find((s) => s.id === id);
export const knownSkills = (f: Pick<Fighter, "skills">) =>
  SKILLS.filter((s) => f.skills?.includes(s.id));
export function skillManeuver(s: Skill): Maneuver {
  return {
    ...structuredClone(s.figure!),
    skillId: s.id,
  };
}
export const isEvade = (m?: Maneuver) =>
  !!m?.evades || (!!m?.skillId && skill(m.skillId)?.effect === "evade");
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
  while (current.length <= index) current.push(null);
  current[index] = id;
  f.skills = current;
}
