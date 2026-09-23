import { createGame, nextBattle, weapon } from "../src/game/combat/engine";
import {
  beginBattle,
  publicBoard,
  reveal,
  resolveSequence,
} from "../src/game/combat/board-engine";
import {
  maneuvers,
  placementCells,
  possiblePlacements,
} from "../src/game/combat/board";
import type { Placement, PublicGame, Stats } from "../src/game/types";
const rng = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const builds: {
  name: string;
  stats: Stats;
  weapon: string | null;
  shield?: string;
}[] = [
  {
    name: "Кулак",
    stats: {
      strength: 1,
      agility: 1,
      endurance: 1,
      intelligence: 1,
      reaction: 1,
    },
    weapon: null,
  },
  {
    name: "Кинжал / ловкость",
    stats: {
      strength: 1,
      agility: 6,
      endurance: 3,
      intelligence: 1,
      reaction: 3,
    },
    weapon: "dagger",
  },
  {
    name: "Топор / сила",
    stats: {
      strength: 7,
      agility: 1,
      endurance: 3,
      intelligence: 1,
      reaction: 2,
    },
    weapon: "axe",
  },
  {
    name: "Меч и щит",
    stats: {
      strength: 4,
      agility: 2,
      endurance: 5,
      intelligence: 1,
      reaction: 2,
    },
    weapon: "shortsword",
    shield: "kite-shield",
  },
  {
    name: "Посох",
    stats: {
      strength: 1,
      agility: 1,
      endurance: 3,
      intelligence: 6,
      reaction: 3,
    },
    weapon: "staff",
  },
  {
    name: "Кинжал / инициатива",
    stats: {
      strength: 1,
      agility: 3,
      endurance: 3,
      intelligence: 1,
      reaction: 6,
    },
    weapon: "dagger",
  },
];
function place(g: PublicGame): Placement[] {
  const result: Placement[] = [],
    used: number[] = [];
  const tokens = maneuvers(g.player)
    .map((m) => ({
      m,
      score:
        m.action === "advance" && g.distance > weapon(g.player).range!
          ? 20
          : m.action === "attack"
            ? 10
            : m.action === "heavy"
              ? 8
              : m.action === "block"
                ? 5
                : m.action === "rest"
                  ? 4
                  : 1,
    }))
    .sort((a, b) => b.score - a.score);
  for (const { m } of tokens) {
    if (result.length === 4) break;
    if (m.action === "equip" || m.action === "retreat") continue;
    const fit = possiblePlacements(m, g.planning!.blocked, used)[0];
    if (fit) {
      result.push(fit);
      used.push(...placementCells(m, fit, {}));
    }
  }
  return result;
}
const count = Number(process.env.BALANCE_SAMPLES ?? 200),
  seedBase = Number(process.env.BALANCE_SEED ?? 50000),
  results = [];
for (const build of builds)
  for (const policy of ["placement-order", "reactive-order"]) {
    let wins = 0,
      draws = 0,
      turns = 0;
    for (let n = 0; n < count; n++) {
      const random = rng(seedBase + n);
      let g = createGame("Симуляция", random);
      g.player.stats = { ...build.stats };
      g.player.gear.weapon = build.weapon;
      g.player.gear.shield = build.shield ?? null;
      g.phase = "defeat";
      g = beginBattle(nextBattle(g, random), random);
      for (let round = 0; round < 100 && g.phase === "combat"; round++) {
        const chosen = place(publicBoard(g));
        g = reveal(g, chosen, {}, random);
        const order = chosen.map((p) => p.id);
        if (policy === "reactive-order") {
          const visible = publicBoard(g),
            set = visible.planning!.enemyActions!.map((a) => a.id);
          const score = (id: string) =>
            id === "advance" && g.distance > weapon(g.player).range!
              ? 30
              : id === "parry" && set.includes("heavy")
                ? 25
                : id === "kick" && set.includes("heavy")
                  ? 24
                  : id === "guard" && set.some((id) => id.startsWith("strike"))
                    ? 20
                    : id === "rest" && (g.player.poise ?? 6) < 3
                      ? 18
                      : id.startsWith("strike")
                        ? 10
                        : id === "heavy"
                          ? 9
                          : 1;
          order.sort((a, b) => score(b) - score(a));
        }
        g = resolveSequence(g, order, random);
        turns++;
      }
      if (g.phase === "victory") wins++;
      if (g.phase === "combat") draws++;
    }
    results.push({
      build: build.name,
      policy,
      samples: count,
      wins,
      draws,
      winRate: Math.round((wins / count) * 1000) / 10,
      averageRounds: Math.round((turns / count) * 10) / 10,
    });
  }
console.log(
  JSON.stringify(
    {
      version: 3,
      seedBase,
      note: "Both policies choose the same greedy packing. Reactive order sees only the revealed unordered set, never the AI queue. Sample is not proof of global balance.",
      results,
    },
    null,
    2,
  ),
);
