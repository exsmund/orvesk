import base from "../../../data/base-figures.json";
import creatures from "../../../data/creatures.json";
import weapons from "../../../data/weapons.json";
import armor from "../../../data/armor.json";
import jewelry from "../../../data/jewelry.json";
import skills from "../../../data/skills.json";
import images from "../../../data/item-art.json";
import type { Maneuver } from "@/game/types";

type ArtDefinition = { id: string; art?: string };
const artwork = new Map<string, string>();
function register(prefix: string, figures: ArtDefinition[], fallback?: string) {
  for (const figure of figures) {
    const art = figure.art ?? fallback;
    if (art) artwork.set(`${prefix}:${figure.id}`, art);
  }
}
register("base", base);
for (const species of creatures) {
  register("base", species.figures);
  for (const variant of Object.values(species.variants ?? {}))
    register("base", variant.figures);
}
for (const equipment of [...weapons, ...armor, ...jewelry])
  register(
    equipment.id,
    equipment.figures,
    (images as Record<string, string>)[equipment.id],
  );

/** Artwork stays current even when a saved card retains its original combat values. */
export function figureArt(figure: Maneuver): string | undefined {
  if (figure.skillId) {
    const skill = skills.find((entry) => entry.id === figure.skillId) as
      (ArtDefinition & { figure?: ArtDefinition }) | undefined;
    return skill?.figure?.art ?? skill?.art ?? figure.art;
  }
  const key = (figure.templateId ?? figure.id)
    .replace(/#\d+$/, "")
    .replace(/@\d+(?=:)/, "");
  return artwork.get(key) ?? figure.art;
}
