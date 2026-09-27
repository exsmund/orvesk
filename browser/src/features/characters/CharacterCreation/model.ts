import { type Stat, type Stats } from "@/game/types";

export type NewCharacter = { name: string; portraitId: string; stats: Stats };
export const descriptions: Record<Stat, string> = {
  strength: "Урон кулаком, пинком и тяжёлым оружием",
  agility: "Урон лёгким оружием и ответного удара при парировании",
  vitality: "Максимальное здоровье; повышение полностью лечит",
  intelligence: "Урон магическим оружием",
};
