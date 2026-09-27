import { createGame } from "@/game/combat/engine";
import { item, ITEMS } from "@/game/equipment/catalog";
import { buildDeck } from "@/game/combat/deck";
import { figureCellDamage } from "@/game/combat/figure-power";
import { possiblePlacements, placementCells } from "@/game/combat/board";
import type { Fighter, Maneuver } from "@/game/types";
import BALANCE from "../../data/combat-balance.json";

// Exact enumeration of equally likely opening hands. This measures opening pressure,
// not win rate: no opponent, armor, exchange, skills or damage to stamina is simulated.
function openingPressure(f: Fighter, staminaBudget: number) {
  const deck = buildDeck(f);
  const cache = new Map<string, number>();
  const geometry = new Map<string, number[]>();
  function bestDamage(hand: Maneuver[]) {
    const key = hand
      .map((m) => m.templateId)
      .sort()
      .join("|");
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let states = new Map<number, number>([[0, 0]]);
    // The state key stores occupied cells (9 bits) and the stamina spent above them.
    for (const m of hand.filter(
      (card) => card.category === "attack" && !card.counter,
    )) {
      let masks = geometry.get(m.templateId!);
      if (!masks) {
        masks = [
          ...new Set(
            possiblePlacements(m, []).map((p) =>
              placementCells(m, p, {}).reduce(
                (mask, cell) => mask | (1 << cell),
                0,
              ),
            ),
          ),
        ];
        geometry.set(m.templateId!, masks);
      }
      const damage = figureCellDamage(f, m) * m.shape.length;
      const next = new Map(states);
      for (const [state, value] of states) {
        const used = state & 511;
        const cost = (state >> 9) + (m.staminaCost ?? 0);
        if (cost > staminaBudget) continue;
        for (const mask of masks) {
          if (used & mask) continue;
          const target = (cost << 9) | used | mask;
          next.set(target, Math.max(next.get(target) ?? 0, value + damage));
        }
      }
      states = next;
    }
    const result = Math.max(...states.values());
    cache.set(key, result);
    return result;
  }
  let sum = 0;
  let count = 0;
  const size = Math.min(BALANCE.handSize, deck.length);
  function draw(start: number, hand: Maneuver[]) {
    if (hand.length === size) {
      sum += bestDamage(hand);
      count++;
      return;
    }
    for (let i = start; i <= deck.length - (size - hand.length); i++)
      draw(i + 1, [...hand, deck[i]]);
  }
  draw(0, []);
  return { hands: count, damage: +(sum / count).toFixed(2) };
}
const ids = process.argv.slice(2);
const selected = ids.includes("--all")
  ? ITEMS.filter((w) => w.kind === "weapon" && !w.unarmed).map((w) => w.id)
  : ids.length
    ? ids
    : ["fist", "dagger", "axe", "shortsword", "bandit-cleaver", "greatsword"];
const rows = selected.map((id) => {
  const f = createGame("Баланс", () => 0.5).player;
  f.stats = { strength: 1, agility: 1, intelligence: 1, vitality: 1 };
  f.skills = [];
  f.gear = {
    weapon: id === "fist" ? null : id,
    shield: null,
    body: null,
    feet: null,
    ring: null,
    amulet: null,
  };
  const cards = buildDeck(f);
  const weaponCards = cards.filter((m) =>
    id === "fist" ? m.id.startsWith("base:fist") : m.weaponId === id,
  );
  const full = openingPressure(f, BALANCE.stamina.max);
  const half = openingPressure(f, BALANCE.stamina.max / 2);
  const recovery = openingPressure(f, BALANCE.stamina.recovery);
  return {
    id,
    weapon: item(id).name,
    weightClass: item(id).weightClass ?? "unarmed",
    weaponCards: weaponCards.length,
    totalCards: cards.length,
    weaponDamage: weaponCards.reduce(
      (n, m) => n + figureCellDamage(f, m) * m.shape.length,
      0,
    ),
    weaponCost: weaponCards.reduce((n, m) => n + (m.staminaCost ?? 0), 0),
    openingHands: full.hands,
    stamina8: full.damage,
    stamina4: half.damage,
    stamina2: recovery.damage,
  };
});
console.log(JSON.stringify(rows, null, 2));
