// Offline experiment only. Does not import the production engine or modify saves.
import { mkdirSync, writeFileSync } from "node:fs";
import {
  initialDeck,
  cardCells,
  deckActions,
  calculateDeck,
  resolveDeck,
  playerLeads,
  reservedPlayerCost,
  deckWolfIntent,
  wolfResponse,
  shuffled,
  composition,
  type DeckState,
  type DeckActionId,
  type DeckPlacement,
} from "../stories/wolf-prototypes/deck-model";
import { random } from "../stories/wolf-prototypes/model";
import { armorRules } from "../stories/wolf-prototypes/deck-armor";

const settings = {
  seeds: Number(process.argv[2] ?? 100),
  candidates: 48,
  hypotheticalHands: 4,
  maxRounds: 80,
  staminaWeight: 0.5,
};
if (!Number.isInteger(settings.seeds) || settings.seeds < 1)
  throw new Error(
    "Pass a positive seed count: node --import tsx scripts/compare-deck-armor.ts 100",
  );

const shapes = new Map(
  Object.keys(deckActions).map((id) => {
    const action = id as DeckActionId;
    const unique = new Map<string, number[]>();
    for (let r = 0; r < 4; r++)
      for (let cell = 0; cell < 9; cell++) {
        const cells = cardCells(action, r, cell);
        if (cells) unique.set([...cells].sort().join(","), cells);
      }
    return [action, [...unique.values()]] as const;
  }),
);

function candidates(s: DeckState, leading: boolean) {
  const rng = random(s.seed * 7919 + s.round * 2347);
  const options = new Map<string, DeckPlacement[]>([["", []]]);
  for (let i = 0; i < settings.candidates; i++) {
    const placed: DeckPlacement[] = [];
    let budget = s.stamina;
    const cards = shuffled(s.hand, s.seed * 467 + s.round * 199 + i * 31);
    for (const card of cards) {
      if (rng() < 0.2) continue;
      const a = deckActions[card.action];
      const cost =
        a.stamina + (leading && a.kind === "guard" ? a.shape.length : 0);
      if (cost > budget) continue;
      const available = shapes
        .get(card.action)!
        .filter(
          (cells) =>
            !cells.some((cell) => placed.some((p) => p.cells.includes(cell))),
        );
      if (!available.length) continue;
      const cells = available[Math.floor(rng() * available.length)];
      placed.push({ uid: card.uid, cells });
      budget -= cost;
    }
    const key = placed
      .map((p) => `${p.uid}:${[...p.cells].sort().join(",")}`)
      .sort()
      .join(";");
    options.set(key, placed);
  }
  return [...options.values()];
}

// The leading hero cannot see the wolf's actual hand, plan or future draws.
// Estimate four hands from the publicly visible full deck instead.
function hypotheticalWorlds(s: DeckState) {
  return Array.from({ length: settings.hypotheticalHands }, (_, i) => {
    const seed = s.seed * 1543 + s.round * 3911 + i * 1229 + 1000003;
    const world: DeckState = {
      ...s,
      seed,
      wolfDeck: {
        hand: shuffled(
          composition.map((action, n) => ({ uid: `hyp-${n}`, action })),
          seed,
        ).slice(0, 4),
        draw: [],
        discard: [],
        shuffles: 0,
      },
    };
    return { state: world, plan: deckWolfIntent(world) };
  });
}

function score(s: DeckState, r: ReturnType<typeof calculateDeck>) {
  const nextStamina = Math.min(8, r.stamina + (r.exhausted ? 0 : 2));
  const nextWolfStamina = Math.min(
    8,
    r.wolfStamina + (r.wolfExhausted ? 0 : 2),
  );
  return (
    r.outgoing -
    r.incoming +
    settings.staminaWeight *
      (nextStamina - s.stamina - (nextWolfStamina - s.wolfStamina)) +
    (r.wolf <= 0 ? 100 : 0) -
    (r.hp <= 0 ? 100 : 0)
  );
}

function play(seed: number, playerArmor: number, wolfArmor: number) {
  let s = initialDeck(seed, undefined, {
    player: playerArmor,
    wolf: wolfArmor,
  });
  const first = playerLeads(s);
  let playerSkips = 0,
    wolfSkips = 0,
    incoming = 0,
    outgoing = 0;
  let playerExhausted = 0,
    wolfExhausted = 0;
  while (!s.result && s.round <= settings.maxRounds) {
    const leading = playerLeads(s);
    const worlds = leading
      ? hypotheticalWorlds(s)
      : [{ state: s, plan: deckWolfIntent(s) }];
    let best: DeckPlacement[] = [],
      bestScore = -Infinity;
    for (const draft of candidates(s, leading)) {
      if (leading && reservedPlayerCost(s, draft) > s.stamina) continue;
      let total = 0,
        legal = true;
      for (const world of worlds) {
        const result = calculateDeck(world.state, draft, world.plan);
        if (result.shortage) {
          legal = false;
          break;
        }
        total += score(world.state, result);
      }
      if (legal && total / worlds.length > bestScore) {
        best = draft;
        bestScore = total / worlds.length;
      }
    }
    const plan = leading ? wolfResponse(s, best) : worlds[0].plan;
    const result = calculateDeck(s, best, plan);
    incoming += result.incoming;
    outgoing += result.outgoing;
    playerSkips += Number(result.skipped);
    wolfSkips += Number(plan.skipped);
    playerExhausted += Number(result.exhausted);
    wolfExhausted += Number(result.wolfExhausted);
    s = resolveDeck(s, best, plan);
  }
  return {
    seed,
    playerArmor,
    wolfArmor,
    first,
    rounds: s.round - 1,
    result: s.result ?? "limit",
    hp: s.hp,
    wolf: s.wolf,
    playerSkips,
    wolfSkips,
    incoming,
    outgoing,
    playerExhausted,
    wolfExhausted,
  };
}

type Run = ReturnType<typeof play>;
const runs: Run[] = [];
for (const playerArmor of armorRules.presets)
  for (const wolfArmor of armorRules.presets) {
    const started = Date.now();
    for (let seed = 1; seed <= settings.seeds; seed++)
      runs.push(play(seed, playerArmor, wolfArmor));
    console.log(
      `Armor ${playerArmor}/${wolfArmor}: ${settings.seeds} battles in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
  }
const mean = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;
const format = (value: number) => value.toFixed(1);
const summaries = armorRules.presets.flatMap((playerArmor) =>
  armorRules.presets.map((wolfArmor) => {
    const group = runs.filter(
      (r) => r.playerArmor === playerArmor && r.wolfArmor === wolfArmor,
    );
    const finished = group.filter((r) => r.result !== "limit");
    const turns = group.reduce((sum, r) => sum + r.rounds, 0);
    return {
      playerArmor,
      wolfArmor,
      wins: group.filter((r) => r.result === "win").length,
      losses: group.filter((r) => r.result === "loss").length,
      draws: group.filter((r) => r.result === "draw").length,
      limits: group.length - finished.length,
      meanRounds: finished.length ? mean(finished.map((r) => r.rounds)) : 0,
      meanIncoming: mean(group.map((r) => r.incoming)),
      meanOutgoing: mean(group.map((r) => r.outgoing)),
      playerSkipPercent:
        (100 * group.reduce((sum, r) => sum + r.playerSkips, 0)) / turns,
      wolfSkipPercent:
        (100 * group.reduce((sum, r) => sum + r.wolfSkips, 0)) / turns,
      playerFirstWins: group.filter((r) => r.first && r.result === "win")
        .length,
      playerFirstBattles: group.filter((r) => r.first).length,
      reactingWins: group.filter((r) => !r.first && r.result === "win").length,
      reactingBattles: group.filter((r) => !r.first).length,
    };
  }),
);
const rows = summaries
  .map(
    (r) =>
      `| ${r.playerArmor} | ${r.wolfArmor} | ${r.wins}/${r.losses}/${r.draws} | ${format(r.meanRounds)} | ${format(r.meanIncoming)} / ${format(r.meanOutgoing)} | ${format(r.playerSkipPercent)}% / ${format(r.wolfSkipPercent)}% | ${r.limits} |`,
  )
  .join("\n");
const report = `# Броня в прототипе колоды: сравнение 0, 2 и 5

Формула: урон здоровью после взаимодействия фигур × 10 / (10 + броня получателя).
Контрудар тоже проходит через броню; выносливость и стоимость фигур не меняются.
Итоговый урон здоровью округляется до десятых один раз за ход, после суммирования клеток.

## Метод

- ${settings.seeds} одинаковых начальных seed (1…${settings.seeds}) для каждой из девяти пар брони: ${runs.length} боёв.
- У всех четыре характеристики по 1, уровень 1, здоровье 30, выносливость 8, восстановление 2. Броня не влияет на уровень.
- Колоды и правила чередования соответствуют интерактивному прототипу. Используется его настоящий calculateDeck/resolveDeck и ИИ волка.
- Автоматический герой рассматривает до ${settings.candidates} случайных допустимых расстановок и пропуск. При реакции он видит план волка; первым ходом оценивает ${settings.hypotheticalHands} гипотетические руки из открытого состава колоды, без доступа к настоящей руке, ответу и будущему добору.
- Оценка: нанесённый минус полученный урон, плюс ${settings.staminaWeight} × изменение разницы выносливости к следующему ходу; смертельный исход даёт ±100. Алгоритм одинаков во всех вариантах. Заменой карты герой не пользуется, планирует на один ход.
- Лимит ${settings.maxRounds} ходов; незавершённые бои учитываются отдельно. Средняя длительность — только завершённые бои. Потери здоровья — в среднем за бой, с ограничением оставшимся здоровьем. Доля пропусков — от общего числа ходов.
- Это сравнение поведения одного алгоритма, а не оценка процента побед людей. Разные решения и длительность могут менять дальнейший добор при одинаковом начальном seed.

## Результаты

| Броня героя | Броня волка | Победы/поражения/ничьи героя | Среднее число ходов | Потери здоровья: герой / волк | Пропуски: герой / волк | Лимит |
|---:|---:|---:|---:|---:|---:|---:|
${rows}

## Воспроизведение

\`node --import tsx scripts/compare-deck-armor.ts ${settings.seeds}\`

Исходные результаты каждого боя и параметры эксперимента: [prototype-armor-comparison.json](./prototype-armor-comparison.json).
Этот файл генерируется скриптом. Действующая формула брони описана в [DECK_COMBAT.md](./DECK_COMBAT.md#броня).
`;
const output = new URL("../../docs", import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL("prototype-armor-comparison.json", output),
  JSON.stringify({ settings, armorK: armorRules.k, summaries, runs }, null, 2) +
    "\n",
);
writeFileSync(new URL("PROTOTYPE_ARMOR_COMPARISON.md", output), report);
console.table(summaries);
