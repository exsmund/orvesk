import BALANCE from "../../../data/combat-balance.json";
import { configuredManeuvers } from "@/game/combat/figure-config";
import { knownSkills, skillManeuver } from "@/game/skills/skills";
import type { Fighter, Maneuver } from "@/game/types";
export function allFigures(f: Fighter): Maneuver[] {
  return configuredManeuvers(f).concat(
    knownSkills(f)
      .filter((s) => s.figure)
      .map((s) => skillManeuver(s)),
  );
}
export function buildDeck(f: Fighter): Maneuver[] {
  const multipliers = knownSkills(f).flatMap((s) =>
    s.deckMultiplier ? [s.deckMultiplier] : [],
  );
  return allFigures(f).flatMap((m) =>
    Array.from(
      {
        length:
          (m.copies ?? 1) *
          multipliers
            .filter((p) => p.category === m.category)
            .reduce((n, p) => n * p.factor, 1),
      },
      (_, i) => ({
        ...structuredClone(m),
        templateId: m.id,
        id: `${m.id}#${i + 1}`,
      }),
    ),
  );
}
export function shuffle<T>(cards: T[], random: () => number): T[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function fillHand(f: Fighter, random: () => number) {
  const d = f.deck!;
  while (d.hand.length < BALANCE.handSize) {
    if (!d.draw.length) {
      if (f.battleMode === "expendable" || !d.discard.length) break;
      d.draw = shuffle(d.discard, random);
      d.discard = [];
    }
    d.hand.push(d.draw.shift()!);
  }
}
export function startDeck(f: Fighter, random: () => number) {
  f.deck = {
    draw: shuffle(buildDeck(f), random),
    hand: [],
    discard: [],
    exchanged: false,
  };
  f.stamina = BALANCE.stamina.max;
  f.exhausted = false;
  fillHand(f, random);
}
export function spendCards(f: Fighter, ids: string[], random: () => number) {
  const d = f.deck!;
  d.discard.push(...d.hand.filter((m) => ids.includes(m.id)));
  d.hand = d.hand.filter((m) => !ids.includes(m.id));
  d.exchanged = false;
  fillHand(f, random);
}
