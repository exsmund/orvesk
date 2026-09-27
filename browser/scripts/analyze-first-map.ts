import { CREATURES } from "@/game/creatures/catalog";
import { simulateFirstMapBattle } from "../tests/helpers/first-map-balance";

const seeds = Number(process.argv.find((v) => /^\d+$/.test(v)) ?? 10);
const original = process.argv.includes("--original");
for (const c of CREATURES.filter(
  (c) => c.encounter.combat && c.encounter.minExpedition <= 1,
)) {
  const results = [];
  for (let stage = 1; stage <= 4; stage++)
    for (let seed = 1; seed <= seeds; seed++)
      results.push(
        simulateFirstMapBattle({
          creatureId: c.id,
          stage,
          seed: seed + stage * 1000,
          original,
        }),
      );
  console.log(
    JSON.stringify({
      creature: c.name,
      original,
      fights: results.length,
      wins: results.filter((r) => r.outcome === "victory").length,
      defeats: results.filter((r) => r.outcome === "defeat").length,
      other: results.filter((r) => !["victory", "defeat"].includes(r.outcome))
        .length,
      minHp: Math.min(...results.map((r) => r.hp)),
      meanHp: +(
        results.reduce((sum, r) => sum + r.hp, 0) / results.length
      ).toFixed(1),
      meanRounds: +(
        results.reduce((sum, r) => sum + r.rounds, 0) / results.length
      ).toFixed(1),
      playerFirst: results.filter((r) => r.first === "player").length,
    }),
  );
}
