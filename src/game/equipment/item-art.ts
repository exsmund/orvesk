import images from "../../../data/item-art.json";
import { item } from "./catalog";
import type { Fighter, Slot } from "../types";

export const ITEM_IMAGES: Record<string, string> = images;
export const itemImage = (id: string) => ITEM_IMAGES[id];
export function equipmentSlot(fighter: Fighter, slot: Slot) {
  const held = item(fighter.gear.weapon);
  const blocked = slot === "shield" && held.hands === 2;
  const equipment = blocked
    ? null
    : slot === "weapon"
      ? held
      : fighter.gear[slot]
        ? item(fighter.gear[slot])
        : null;
  return {
    equipment,
    blocked,
    occupiedBy: blocked ? held : null,
    unarmed: slot === "weapon" && held.id === "fist",
  };
}
