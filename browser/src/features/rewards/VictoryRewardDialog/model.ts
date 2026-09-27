import { item } from "@/game/equipment/catalog";
import { skill } from "@/game/skills/skills";
import type { Reward } from "@/game/types";
import { soulWord } from "@/features/characters/soul-word";

export const rewardName = (r: Reward) =>
  r.kind === "souls"
    ? `${r.amount} ${soulWord(r.amount)}`
    : r.kind === "item"
      ? item(r.itemId).name
      : `Навык: ${skill(r.skillId)?.name}`;
