import { creature } from "@/game/creatures/catalog";
import BALANCE from "../../../data/combat-balance.json";
import baseFigures from "../../../data/base-figures.json";
import { PORTRAITS, isPortraitId } from "@/game/characters/portraits";
import type {
  EnemyStyle,
  Fighter,
  Game,
  Item,
  Maneuver,
  Reward,
  Stat,
} from "@/game/types";

export const STYLES: Record<EnemyStyle, { name: string; description: string }> =
  {
    berserker: {
      name: "Берсерк",
      description:
        "Наступает и вкладывается в сильные удары. Часто раскрывается.",
    },
    duelist: {
      name: "Дуэлянт",
      description:
        "Держит дистанцию и отвечает парированием на повторяющиеся удары.",
    },
    warden: {
      name: "Страж",
      description: "Берегёт устойчивость, держит блок и оттесняет противника.",
    },
  };
export const maxStamina = () => BALANCE.stamina.max;
export const stamina = (f: Fighter) => f.stamina ?? maxStamina();
export const requirementGap = (f: Fighter, i: Item) =>
  Object.entries(i.requirements).reduce(
    (sum, [stat, value]) =>
      sum + Math.max(0, value - f.stats[stat as keyof typeof f.stats]),
    0,
  );
/** Convert old saved snapshots at the boundary; combat only reads current effects. */
function normalizeStoredFigure(figure?: Maneuver) {
  if (!figure) return;
  const legacy = figure as Maneuver & { action?: string };
  if (legacy.action !== undefined) {
    figure.blocks ??= legacy.action === "block";
    if (!figure.art && !figure.skillId) {
      if (legacy.action === "kick")
        figure.art = baseFigures.find((m) => m.id === "kick")?.art;
      else if (
        !figure.weaponId &&
        !figure.shieldId &&
        !figure.equipmentId &&
        (legacy.action === "attack" || legacy.action === "block")
      )
        figure.art = baseFigures.find(
          (m) => m.id === (legacy.action === "block" ? "guard" : "fist"),
        )?.art;
    }
    delete legacy.action;
  }
  if (figure?.healthDamage)
    figure.healthDamage.stats = figure.healthDamage.stats.map((stat: string) =>
      stat === "reaction" ? "agility" : (stat as Stat),
    );
}

/** Preserve current combat state and committed plans when loading. */
export function normalizeGame(saved: Game): Game {
  const g = structuredClone(saved);
  if (g.version !== 5)
    throw new Error("Сохранение несовместимо. Создайте героя заново.");
  // Disable obstacles in an ongoing turn without rerolling cards or committed moves.
  // Completed turns keep their original terrain for the result/replay screen.
  if (BALANCE.board.rockChance === 0 && g.clashPlan) {
    g.clashPlan.blocked = [];
    for (const mod of [
      g.clashPlan.playerModifiers,
      g.clashPlan.enemyModifiers,
      g.clashPlan.committedPlayerModifiers,
    ])
      if (mod) delete mod.unlocked;
  }
  for (const f of [
    g.player,
    g.enemy,
    ...Object.values(g.journey?.enemies ?? {}),
  ]) {
    const stats = f.stats as Fighter["stats"] & { reaction?: number };
    if (typeof stats.reaction === "number" && Number.isFinite(stats.reaction))
      stats.agility += Math.max(0, stats.reaction - 1);
    delete stats.reaction;
    if (f.deck)
      for (const card of [...f.deck.draw, ...f.deck.hand, ...f.deck.discard])
        normalizeStoredFigure(card);
  }
  for (const turn of g.log)
    for (const cell of turn.clash?.cells ?? []) {
      normalizeStoredFigure(cell.player);
      normalizeStoredFigure(cell.enemy);
    }
  const obsolete = g as Game & Record<string, unknown>;
  for (const key of [
    "distance",
    "ground",
    "enemyIntent",
    "enemyTell",
    "roundPlan",
    "lastFirst",
  ])
    delete obsolete[key];
  for (const f of [g.player, g.enemy]) {
    const obsolete = f as Fighter & Record<string, unknown>;
    delete obsolete.exposed;
    f.stamina = Math.max(
      0,
      Math.min(
        maxStamina(),
        Number.isFinite(f.stamina) ? f.stamina! : maxStamina(),
      ),
    );
  }
  // Existing battles receive a stable portrait without rerolling combat or equipment.
  if (creature(g.enemy.creatureId)) {
    g.enemy.portraitId = `creature:${g.enemy.creatureId}`;
  } else if (!isPortraitId(g.enemy.portraitId)) {
    const seed = JSON.stringify([g.fight, g.enemy.name, g.enemy.stats]);
    let hash = 0;
    for (const char of seed)
      hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    const pool = PORTRAITS.filter((p) => p.id !== g.player.portraitId);
    g.enemy.portraitId = pool[hash % pool.length].id;
  }
  g.enemy.style ??= "berserker";
  return g;
}
export function selectedReward(
  game: Pick<Game, "reward" | "rewardOptions">,
  index = 0,
): Reward | null {
  return game.rewardOptions?.length
    ? (game.rewardOptions[index] ?? null)
    : index === 0
      ? game.reward
      : null;
}
