import { ACTIONS } from "../equipment/catalog";
import { PORTRAITS, isPortraitId } from "../characters/portraits";
import type {
  Choice,
  EnemyStyle,
  EnemyTell,
  Fighter,
  Game,
  Item,
  PublicGame,
  Reward,
} from "../types";

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
export const TELLS: Record<EnemyTell, { text: string; hint: string }> = {
  windup: {
    text: "Вкладывает вес в замах",
    hint: "Готовит мощный удар, пинок или удар щитом. Дистанция и срыв подготовки могут помочь.",
  },
  guard: {
    text: "Прикрывается и выжидает",
    hint: "Блок или парирование. Пинок нарушает стойку, сильный удар давит на блок.",
  },
  advance: {
    text: "Переносит вес вперёд",
    hint: "Готовится сблизиться. Проверьте, достанет ли ваше оружие.",
  },
  retreat: {
    text: "Переносит вес назад",
    hint: "Может отступить с ударом или блоком. Удар без шага рискует не достать.",
  },
  pressure: {
    text: "Держит оружие наготове",
    hint: "Вероятен быстрый удар с места.",
  },
  recover: {
    text: "Сбавляет темп, переводит дыхание",
    hint: "Восстанавливает силы или поднимается. Можно перехватить инициативу.",
  },
  reach: {
    text: "Тянется к предмету на земле",
    hint: "Меняет экипировку и оставляет время для вашей атаки.",
  },
};
export const maxStamina = (f: Fighter) =>
  6 + Math.min(6, Math.floor((f.stats.endurance - 1) / 2));
export const maxPoise = (f: Fighter) =>
  6 + Math.min(8, Math.floor((f.stats.endurance - 1) / 2));
export const stamina = (f: Fighter) => f.stamina ?? maxStamina(f);
export const poise = (f: Fighter) => f.poise ?? maxPoise(f);
export const exposed = (f: Fighter) => (f.exposed ?? 0) > 0;
const costs = {
  attack: 1,
  heavy: 3,
  block: 0,
  parry: 1,
  kick: 2,
  equip: 1,
  shield: 2,
  rest: 0,
};
export function actionCost(f: Fighter, c: Choice) {
  if (f.prone) return 0;
  return (
    costs[c.action] +
    (!f.offBalance &&
    (c.action === "attack" || c.action === "block") &&
    c.step !== 0
      ? 1
      : 0)
  );
}
export const requirementGap = (f: Fighter, i: Item) =>
  Object.entries(i.requirements).reduce(
    (sum, [stat, value]) =>
      sum + Math.max(0, value - f.stats[stat as keyof typeof f.stats]),
    0,
  );
export function tellFor(intent: Choice, fighter: Fighter): EnemyTell {
  if (fighter.prone || intent.action === "rest") return "recover";
  if (intent.action === "equip") return "reach";
  if (intent.step < 0 && !fighter.offBalance) return "retreat";
  if (intent.action === "block" || intent.action === "parry") return "guard";
  if (["heavy", "kick", "shield"].includes(intent.action)) return "windup";
  return intent.step > 0 && !fighter.offBalance ? "advance" : "pressure";
}
/** Safe migration: keep the current battle, committed intent, gear and single legacy reward. */
export function normalizeGame(saved: Game): Game {
  const g = structuredClone(saved);
  g.version = saved.version === 4 ? 4 : saved.version === 3 ? 3 : 2;
  for (const f of [g.player, g.enemy]) {
    const oldStats = f.stats as typeof f.stats & { initiative?: number };
    f.stats.reaction ??= oldStats.initiative ?? 1;
    delete oldStats.initiative;
    f.stamina = Math.max(
      0,
      Math.min(
        maxStamina(f),
        Number.isFinite(f.stamina) ? f.stamina! : maxStamina(f),
      ),
    );
    f.poise = Math.max(
      0,
      Math.min(maxPoise(f), Number.isFinite(f.poise) ? f.poise! : maxPoise(f)),
    );
    f.exposed = Math.max(0, Number.isFinite(f.exposed) ? f.exposed! : 0);
  }
  // Existing battles receive a stable portrait without rerolling combat or equipment.
  if (!isPortraitId(g.enemy.portraitId)) {
    const seed = JSON.stringify([g.fight, g.enemy.name, g.enemy.stats]);
    let hash = 0;
    for (const char of seed)
      hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    const pool = PORTRAITS.filter((p) => p.id !== g.player.portraitId);
    g.enemy.portraitId = pool[hash % pool.length].id;
  }
  g.enemy.style ??= "berserker";
  if (
    !ACTIONS[g.enemyIntent.action] ||
    actionCost(g.enemy, g.enemyIntent) > stamina(g.enemy)
  )
    g.enemyIntent = { action: "rest", step: 0 };
  g.enemyTell = tellFor(g.enemyIntent, g.enemy);
  return g;
}
export function publicGame(saved: Game): PublicGame {
  const {
    enemyIntent: _secret,
    roundPlan: _plan,
    ...visible
  } = normalizeGame(saved);
  return visible;
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
export const specialEffect = (i: Item) => {
  if (i.fullBlockPoiseRecovery)
    return `Полный блок: +${i.fullBlockPoiseRecovery} стойки за каждую полностью перекрытую блоками этого щита фигуру атаки, включая пинок и удар щитом. Без ограничения срабатываний за раунд. Несколько блоков одной атаки дают бонус один раз. Восстановление до максимума, перед входящим уроном стойке.`;
  const types = i.damage?.map((d) => d.type) ?? [];
  return [
    types.includes("fire")
      ? "Огонь: интеллект помогает обходить плоскую защиту."
      : "",
    types.includes("frost")
      ? "Мороз: −1 клетка следующего раунда, затем один раунд защиты от повторного замедления."
      : "",
    types.includes("wind")
      ? "Ветер: отдельный тип урона; учитывается сопротивление ветру."
      : "",
    types.includes("magic")
      ? "Магия: прошедшая атака дополнительно снимает 1 стойки."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};
