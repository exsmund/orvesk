import assert from "node:assert/strict";
import { damageAfterArmor } from "../stories/wolf-prototypes/deck-armor";
import test from "node:test";
import {
  initialDeck,
  playerLeads,
  reservedPlayerCost,
  hiddenWolfPlan,
  wolfResponse,
  exchangeCard,
  cardCells,
  deckWolfIntent,
  calculateDeck,
  resolveDeck,
  placementError,
  refill,
  deckActions,
  playerStaminaDamagePerCell,
  wolfStaminaDamagePerCell,
  damageFormula,
  healthDamagePerCell,
} from "../stories/wolf-prototypes/deck-model";
import {
  defaultDeckStats,
  deckMaxHealth,
  deckLevel,
  deckStatKeys,
} from "../stories/wolf-prototypes/deck-progression";
test("both fighters start equally healthy with seven attacks and three defenses", () => {
  const s = initialDeck();
  assert.deepEqual(s, initialDeck());
  assert.equal(s.hp, 30);
  assert.equal(s.wolf, 30);
  for (const d of [s, s.wolfDeck]) {
    assert.equal(d.hand.length, 4);
    const cards = [...d.hand, ...d.draw];
    assert.equal(
      cards.filter((c) => deckActions[c.action].kind === "attack").length,
      7,
    );
    assert.equal(
      cards.filter((c) => deckActions[c.action].kind !== "attack").length,
      3,
    );
    assert.equal(new Set([...d.hand, ...d.draw].map((c) => c.uid)).size, 10);
  }
});
test("wolf plans use held cards, legal geometry and available stamina across seeds", () => {
  for (let seed = 0; seed < 100; seed++) {
    const s = initialDeck(seed),
      p = deckWolfIntent(s);
    assert.equal(
      placementError(
        { ...s, hand: s.wolfDeck.hand, stamina: s.wolfStamina },
        p.placements,
      ),
      undefined,
    );
    assert.deepEqual(p, deckWolfIntent(s));
    assert.ok(p.cost <= s.wolfStamina);
  }
});
test("wolf spends cards only after resolution and retains unused cards", () => {
  const s = initialDeck(),
    before = structuredClone(s),
    plan = deckWolfIntent(s);
  const n = resolveDeck(s, []);
  assert.deepEqual(s, before);
  const ids = new Set(plan.placements.map((p) => p.uid));
  assert.equal(n.wolfDeck.hand.length, 4);
  assert.ok(
    s.wolfDeck.hand
      .filter((c) => !ids.has(c.uid))
      .every((c) => n.wolfDeck.hand.some((n) => n.uid === c.uid)),
  );
  assert.equal(n.wolfDeck.discard.length, ids.size);
});
test("both recover two at new turn after paying costs", () => {
  const s = initialDeck();
  s.hand = [{ uid: "test", action: "thrust" }];
  const card = s.hand[0];
  const placements = [{ uid: card.uid, cells: [8] }];
  // Seed 42 starts with a one-cell thrust.
  const r = calculateDeck(s, placements),
    n = resolveDeck(s, placements);
  assert.equal(n.stamina, Math.min(8, r.stamina + 2));
  assert.equal(n.wolfStamina, Math.min(8, r.wolfStamina + 2));
});
test("exhausted wolf skips, restores stamina and receives normal damage", () => {
  const s = {
    ...initialDeck(),
    wolfStamina: 0,
    hand: [{ uid: "test", action: "thrust" as const }],
  };
  assert.equal(deckWolfIntent(s).skipped, true);
  const r = calculateDeck(s, [{ uid: s.hand[0].uid, cells: [8] }]);
  assert.equal(r.incoming, 0);
  assert.equal(r.outgoing, 6);
  assert.equal(r.wolfStamina, 8);
});
test("skip retains player cards and cannot revive the dead", () => {
  const s = { ...initialDeck(), stamina: 0 };
  const n = resolveDeck(s, []);
  assert.equal(n.stamina, 8);
  assert.deepEqual(n.hand, s.hand);
  const r = calculateDeck({ ...s, hp: 0 }, []);
  assert.equal(r.hp, 0);
  assert.equal(r.stamina, 0);
});
test("all nine cells remain usable", () => {
  const s = {
    ...initialDeck(),
    hand: [
      { uid: "h", action: "heavy" as const },
      ...["a", "b", "c"].map((uid) => ({ uid, action: "guard" as const })),
    ],
  };
  assert.equal(
    placementError(s, [
      { uid: "h", cells: [0, 1, 4] },
      { uid: "a", cells: [2, 5] },
      { uid: "b", cells: [3, 6] },
      { uid: "c", cells: [7, 8] },
    ]),
    undefined,
  );
});
test("reshuffle conserves cards", () => {
  const s = initialDeck();
  const n = refill({
    ...s,
    hand: [],
    draw: [],
    discard: [...s.hand, ...s.draw],
  });
  assert.equal(n.hand.length, 4);
  assert.equal(new Set([...n.hand, ...n.draw].map((c) => c.uid)).size, 10);
});

test("unaffordable blocks remain in draft but cannot resolve; removing attack fixes it", () => {
  const s = {
    ...initialDeck(),
    stamina: 3,
    hand: [
      { uid: "g", action: "guard" as const },
      { uid: "t", action: "thrust" as const },
    ],
    wolfDeck: {
      hand: [{ uid: "w", action: "strike" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const cells = deckWolfIntent(s).placements[0].cells;
  const free = Array.from({ length: 9 }, (_, i) => i).find(
    (i) => !cells.includes(i),
  )!;
  const draft = [
    { uid: "g", cells },
    { uid: "t", cells: [free] },
  ];
  assert.equal(placementError(s, draft), undefined);
  const r = calculateDeck(s, draft);
  assert.equal(r.shortage, 2);
  assert.equal(r.blockCost, 2);
  assert.equal(r.incoming, 0);
  assert.throws(() => resolveDeck(s, draft), /Не хватает 2/);
  assert.equal(calculateDeck(s, draft.slice(0, 1)).shortage, 0);
});
test("wolf reserves every guard cell for every available stamina level", () => {
  for (let seed = 0; seed < 100; seed++)
    for (let stamina = 0; stamina <= 8; stamina++) {
      const s = { ...initialDeck(seed), wolfStamina: stamina };
      const p = deckWolfIntent(s);
      assert.ok(
        p.cost +
          p.actions
            .filter((a) => a.action === "guard")
            .reduce((n, a) => n + a.cells.length, 0) <=
          stamina,
      );
    }
});

test("bite damages stamina after costs, halves on attack and is stopped by guard", () => {
  const s = {
    ...initialDeck(),
    hand: [
      { uid: "t", action: "thrust" as const },
      { uid: "g", action: "guard" as const },
    ],
    wolfDeck: {
      hand: [{ uid: "bite", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const n = deckWolfIntent(s).cells[0];
  const free = (n + 1) % 9;
  const full = calculateDeck(s, [{ uid: "t", cells: [free] }]);
  assert.equal(full.incomingStamina, 2);
  assert.equal(full.stamina, 3);
  assert.equal(full.shortage, 0);
  const clash = calculateDeck(s, [{ uid: "t", cells: [n] }]);
  assert.equal(clash.incomingStamina, 1);
  assert.equal(clash.stamina, 4);
  const guardCells = n % 3 === 2 ? [n - 1, n] : [n, n + 1];
  const block = calculateDeck(s, [{ uid: "g", cells: guardCells }]);
  assert.equal(block.incomingStamina, 0);
  assert.equal(block.blockCost, 1);
  assert.equal(block.incoming, 0);
  const empty = calculateDeck({ ...s, stamina: 3 }, [
    { uid: "t", cells: [free] },
  ]);
  assert.equal(empty.stamina, 0);
  assert.equal(empty.shortage, 0);
  assert.doesNotThrow(() =>
    resolveDeck({ ...s, stamina: 3 }, [{ uid: "t", cells: [free] }]),
  );
  const skipped = calculateDeck(s, []);
  assert.equal(skipped.incomingStamina, 2);
  assert.equal(skipped.stamina, 8);
});

test("heavy strike deals stamina damage by cell, with block and clash modifiers", () => {
  const s = {
    ...initialDeck(),
    hand: [{ uid: "h", action: "heavy" as const }],
    wolfDeck: { hand: [], draw: [], discard: [], shuffles: 0 },
  };
  const r = calculateDeck(s, [{ uid: "h", cells: [0, 1, 3] }]);
  assert.equal(r.outgoingStamina, 3);
  assert.equal(r.outgoing, 9);
  const guarded = {
    ...s,
    wolfDeck: { ...s.wolfDeck, hand: [{ uid: "g", action: "guard" as const }] },
  };
  const plan = deckWolfIntent(guarded);
  const overlap = [0, 1, 3].filter((n) => plan.cells.includes(n)).length;
  const b = calculateDeck(guarded, [{ uid: "h", cells: [0, 1, 3] }]);
  assert.equal(b.outgoingStamina, 3 - overlap);
  assert.equal(b.wolfStamina, 8 - overlap - (3 - overlap));
  const attacking = {
    ...s,
    wolfDeck: {
      ...s.wolfDeck,
      hand: [{ uid: "t", action: "thrust" as const }],
    },
  };
  const hits = [0, 1, 3].filter((n) =>
    deckWolfIntent(attacking).cells.includes(n),
  ).length;
  assert.equal(
    calculateDeck(attacking, [{ uid: "h", cells: [0, 1, 3] }]).outgoingStamina,
    3 - hits * 0.5,
  );
});

test("base damage is integral per cell and totals follow geometry", () => {
  for (const [id, a] of Object.entries(deckActions)) {
    assert.ok(Number.isInteger(a.healthDamagePerCell));
    assert.ok(
      Number.isInteger(
        playerStaminaDamagePerCell[id as keyof typeof deckActions],
      ),
    );
    assert.ok(
      Number.isInteger(
        wolfStaminaDamagePerCell[id as keyof typeof deckActions],
      ),
    );
  }
  assert.equal(
    damageFormula(
      deckActions.heavy.healthDamagePerCell,
      deckActions.heavy.shape.length,
    ),
    "3×3",
  );
  const s = {
    ...initialDeck(),
    hand: [{ uid: "s", action: "strike" as const }],
    wolfDeck: { hand: [], draw: [], discard: [], shuffles: 0 },
  };
  assert.equal(calculateDeck(s, [{ uid: "s", cells: [0, 1] }]).outgoing, 6);
});

test("exchange costs one, preserves wolf plan, cannot repeat and resets next turn", () => {
  const s = initialDeck();
  const plan = deckWolfIntent(s);
  const next = exchangeCard(s, s.hand[0].uid);
  assert.equal(next.stamina, 7);
  assert.equal(next.hand.length, 4);
  assert.deepEqual(deckWolfIntent(next), plan);
  assert.throws(() => exchangeCard(next, next.hand[0].uid));
  assert.equal(resolveDeck(next, []).exchanged, false);
  assert.throws(() => exchangeCard({ ...s, stamina: 0 }, s.hand[0].uid));
});
test("dodge and parry prevent both damage types; parry counters only an attack", () => {
  for (const action of ["dodge", "parry"] as const) {
    const s = {
      ...initialDeck(),
      hand: [{ uid: "def", action }],
      wolfDeck: {
        hand: [{ uid: "bite", action: "thrust" as const }],
        draw: [],
        discard: [],
        shuffles: 0,
      },
    };
    const cell = deckWolfIntent(s).cells[0];
    // Find a legal rotated defensive shape covering the bite.
    const candidates = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 9 }, (_, n) => cardCells(action, r, n)),
    ).flat();
    const cells = candidates.find((c) => c?.includes(cell))!;
    const result = calculateDeck(s, [{ uid: "def", cells }]);
    assert.equal(result.incoming, 0);
    assert.equal(result.incomingStamina, 0);
    assert.equal(result.attackCost, 2);
    assert.equal(result.blockCost, 0);
    assert.equal(result.outgoing, action === "parry" ? 2 : 0);
    const idle = calculateDeck({ ...s, wolfStamina: 0 }, [
      { uid: "def", cells },
    ]);
    assert.equal(idle.outgoing, 0);
  }
});
test("stamina damage exhausting either fighter suppresses only the next regeneration", () => {
  const s = {
    ...initialDeck(),
    stamina: 3,
    hand: [{ uid: "t", action: "thrust" as const }],
    wolfDeck: {
      hand: [{ uid: "bite", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const n = deckWolfIntent(s).cells[0];
  const placement = [{ uid: "t", cells: [(n + 1) % 9] }];
  assert.equal(calculateDeck(s, placement).exhausted, true);
  assert.equal(resolveDeck(s, placement).stamina, 0);
  const h = {
    ...s,
    stamina: 8,
    wolfStamina: 3,
    hand: [{ uid: "h", action: "heavy" as const }],
  };
  const hp = [{ uid: "h", cells: [0, 1, 3] }];
  assert.equal(calculateDeck(h, hp).wolfExhausted, true);
  assert.equal(resolveDeck(h, hp).wolfStamina, 0);
});

test("initiative is seeded once and alternates each round", () => {
  const seen = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const s = initialDeck(seed);
    seen.add(playerLeads(s));
    assert.notEqual(playerLeads(s), playerLeads({ ...s, round: 2 }));
    assert.equal(playerLeads(s), playerLeads({ ...s, round: 3 }));
  }
  assert.equal(seen.size, 2);
});
test("first player reserves all guard cells; hidden plan reveals nothing", () => {
  const s = {
    ...initialDeck(),
    stamina: 1,
    hand: [{ uid: "g", action: "guard" as const }],
  };
  const p = [{ uid: "g", cells: [0, 1] }];
  assert.equal(reservedPlayerCost(s, p), 2);
  assert.throws(() => wolfResponse(s, p));
  const hidden = hiddenWolfPlan(s);
  assert.deepEqual(hidden.cells, []);
  assert.equal(hidden.damage, 0);
  assert.deepEqual(hidden.actions, []);
});
test("wolf response is legal and ignores future draws; resolution uses revealed cards", () => {
  const s = {
    ...initialDeck(),
    hand: [{ uid: "t", action: "thrust" as const }],
  };
  const p = [{ uid: "t", cells: [0] }];
  const plan = wolfResponse(s, p);
  assert.deepEqual(wolfResponse({ ...s, draw: [], discard: [] }, p), plan);
  assert.equal(
    placementError(
      { ...s, hand: s.wolfDeck.hand, stamina: s.wolfStamina },
      plan.placements,
    ),
    undefined,
  );
  const r = calculateDeck(s, p, plan),
    next = resolveDeck(s, p, plan);
  assert.equal(next.hp, r.hp);
  assert.equal(next.wolf, r.wolf);
  assert.equal(next.wolfDeck.discard.length, plan.placements.length);
});

test("custom attributes set independent levels and health without changing decks or initiative", () => {
  const baseline = initialDeck(12);
  const player = { ...defaultDeckStats, strength: 4 };
  const wolf = { ...defaultDeckStats, agility: 2 };
  const s = initialDeck(12, { player, wolf });
  assert.equal(deckLevel(s.stats.player), 4);
  assert.equal(deckLevel(s.stats.wolf), 2);
  assert.equal(s.hp, 36);
  assert.equal(s.wolf, 32);
  assert.equal(s.stamina, 8);
  assert.equal(s.wolfStamina, 8);
  assert.deepEqual(s.hand, baseline.hand);
  assert.deepEqual(s.draw, baseline.draw);
  assert.deepEqual(s.wolfDeck, baseline.wolfDeck);
  assert.equal(playerLeads(s), playerLeads(baseline));
  player.strength = 20;
  assert.equal(s.stats.player.strength, 4);
  assert.ok(!("vitality" in s.stats.player));
});

test("every remaining attribute increases health, only relevant ones increase card damage", () => {
  for (const stat of deckStatKeys) {
    const stats = { ...defaultDeckStats, [stat]: 3 };
    assert.equal(deckMaxHealth(stats), 34);
    assert.equal(
      healthDamagePerCell("heavy", stats),
      stat === "strength" ? 5 : 3,
    );
    assert.equal(
      healthDamagePerCell("thrust", stats),
      stat === "agility" ? 10 : 6,
    );
    assert.equal(
      healthDamagePerCell("parry", stats),
      stat === "agility" ? 4 : 2,
    );
    assert.equal(healthDamagePerCell("guard", stats), 0);
    assert.equal(healthDamagePerCell("dodge", stats), 0);
  }
});

test("invalid attributes cannot start a battle", () => {
  for (const strength of [0, -1, 1.5, NaN, Infinity, 100]) {
    const stats = { ...defaultDeckStats, strength };
    assert.throws(
      () => initialDeck(42, { player: stats, wolf: defaultDeckStats }),
      /Характеристики/,
    );
    assert.throws(
      () => initialDeck(42, { player: defaultDeckStats, wolf: stats }),
      /Характеристики/,
    );
  }
});

test("scaled heavy damage resolves per cell while stamina damage and costs stay fixed", () => {
  const s = {
    ...initialDeck(42, {
      player: { ...defaultDeckStats, strength: 4 },
      wolf: defaultDeckStats,
    }),
    hand: [{ uid: "h", action: "heavy" as const }],
    wolfDeck: { hand: [], draw: [], discard: [], shuffles: 0 },
  };
  const placements = [{ uid: "h", cells: [0, 1, 3] }];
  const r = calculateDeck(s, placements);
  assert.equal(r.outgoing, 18);
  assert.equal(r.outgoingStamina, 3);
  assert.equal(r.attackCost, 4);
  const next = resolveDeck(s, placements);
  assert.equal(next.wolf, 12);
  assert.equal(next.stamina, 6);
  assert.deepEqual(next.stats, s.stats);
});

test("scaled wolf bites and player thrusts use their own attributes in preview and resolution", () => {
  const s = {
    ...initialDeck(42, {
      player: { ...defaultDeckStats, agility: 2 },
      wolf: { ...defaultDeckStats, agility: 4 },
    }),
    hand: [{ uid: "t", action: "thrust" as const }],
    wolfDeck: {
      hand: [{ uid: "w", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const plan = deckWolfIntent(s);
  const cell = plan.cells[0];
  assert.equal(plan.cellDamage[cell], 12);
  assert.equal(plan.damage, 12);
  assert.equal(plan.cellStaminaDamage[cell], 2);
  const placements = [{ uid: "t", cells: [cell] }];
  const r = calculateDeck(s, placements, plan);
  assert.equal(r.incoming, 6);
  assert.equal(r.outgoing, 4);
  assert.equal(r.incomingStamina, 1);
  const next = resolveDeck(s, placements, plan);
  assert.equal(next.hp, 26);
  assert.equal(next.wolf, 32);
  const response = wolfResponse(s, placements);
  assert.equal(response.damage, 12);
  assert.deepEqual(hiddenWolfPlan(s).cellDamage, Array(9).fill(0));
});

test("scaled parry counters only a hit and defense remains complete at high levels", () => {
  const s = {
    ...initialDeck(42, {
      player: { ...defaultDeckStats, agility: 4 },
      wolf: { ...defaultDeckStats, agility: 8 },
    }),
    hand: [{ uid: "p", action: "parry" as const }],
    wolfDeck: {
      hand: [{ uid: "w", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const plan = deckWolfIntent(s);
  const cell = plan.cells[0];
  const r = calculateDeck(s, [{ uid: "p", cells: [cell] }], plan);
  assert.equal(r.incoming, 0);
  assert.equal(r.incomingStamina, 0);
  assert.equal(r.outgoing, 5);
  assert.equal(r.attackCost, 2);
  const empty = calculateDeck(s, [{ uid: "p", cells: [(cell + 1) % 9] }], plan);
  assert.equal(empty.outgoing, 0);
});

test("armor 0, 2 and 5 mitigate the whole heavy attack without changing stamina damage", () => {
  for (const [armor, expected] of [
    [0, 9],
    [2, 7.5],
    [5, 6],
  ]) {
    const s = {
      ...initialDeck(42, undefined, { player: armor, wolf: armor }),
      hand: [{ uid: "h", action: "heavy" as const }],
      wolfDeck: { hand: [], draw: [], discard: [], shuffles: 0 },
    };
    const p = [{ uid: "h", cells: [0, 1, 3] }];
    const r = calculateDeck(s, p);
    assert.equal(r.outgoing, expected);
    assert.equal(r.outgoingAbsorbed, 9 - expected);
    assert.equal(r.attackCost, 4);
    assert.equal(r.outgoingStamina, 3);
    const next = resolveDeck(s, p);
    assert.equal(next.wolf, 30 - expected);
    assert.equal(next.stamina, 6);
    assert.deepEqual(next.armor, s.armor);
  }
});

test("armor belongs to the recipient and mitigation is rounded after summing cell interactions", () => {
  const s = {
    ...initialDeck(42, undefined, { player: 5, wolf: 2 }),
    hand: [{ uid: "s", action: "strike" as const }],
    wolfDeck: {
      hand: [{ uid: "w", action: "strike" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const plan = deckWolfIntent(s);
  const r = calculateDeck(s, [{ uid: "s", cells: plan.cells }], plan);
  // Two cells of 1.25 must yield 2.5, not two individually rounded 1.3s.
  assert.equal(r.incoming, 2);
  assert.equal(r.outgoing, 2.5);
  assert.equal(r.attackCost, 2);
  assert.equal(r.wolfCost, 2);
});

test("round total damage before deducting health, keeping preview and resolved health consistent", () => {
  const s = {
    ...initialDeck(42, undefined, { player: 2, wolf: 2 }),
    hand: [{ uid: "t", action: "thrust" as const }],
    wolfDeck: {
      hand: [{ uid: "w", action: "strike" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const plan = deckWolfIntent(s);
  const placements = [{ uid: "t", cells: [plan.cells[0]] }];
  // One half-hit (1.5) and one full hit (3): 4.5 / 1.2 = 3.75 -> 3.8.
  const preview = calculateDeck(s, placements, plan);
  assert.equal(preview.incoming, 3.8);
  assert.equal(preview.hp, 26.2);
  assert.equal(resolveDeck(s, placements, plan).hp, preview.hp);
});

test("armor preserves full guard/dodge and mitigates a parry counter at its recipient", () => {
  for (const action of ["guard", "dodge", "parry"] as const) {
    const s = {
      ...initialDeck(42, undefined, { player: 2, wolf: 5 }),
      hand: [{ uid: "p", action }],
      wolfDeck: {
        hand: [{ uid: "w", action: "thrust" as const }],
        draw: [],
        discard: [],
        shuffles: 0,
      },
    };
    const plan = deckWolfIntent(s);
    const cells = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 9 }, (_, n) => cardCells(action, r, n)),
    )
      .flat()
      .find((c) => c?.includes(plan.cells[0]))!;
    const r = calculateDeck(s, [{ uid: "p", cells }], plan);
    assert.equal(r.incoming, 0);
    assert.equal(r.incomingStamina, 0);
    assert.equal(r.incomingAbsorbed, 0);
    assert.equal(r.outgoing, action === "parry" ? 1.3 : 0);
    assert.equal(r.blockCost, action === "guard" ? 1 : 0);
  }
});

test("armor never mitigates bite stamina damage or removes exhaustion", () => {
  const s = {
    ...initialDeck(42, undefined, { player: 5, wolf: 0 }),
    stamina: 4,
    hand: [{ uid: "t", action: "thrust" as const }],
    wolfDeck: {
      hand: [{ uid: "w", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const plan = deckWolfIntent(s);
  const r = calculateDeck(
    s,
    [{ uid: "t", cells: [(plan.cells[0] + 1) % 9] }],
    plan,
  );
  assert.equal(r.incoming, 4);
  assert.equal(r.incomingStamina, 2);
  assert.equal(r.exhausted, true);
  assert.equal(r.stamina, 0);
});

test("armor is independent of level, copied at start, and validated for both participants", () => {
  const armor = { player: 2, wolf: 5 };
  const s = initialDeck(42, undefined, armor);
  armor.player = 0;
  assert.equal(s.armor.player, 2);
  assert.equal(deckLevel(s.stats.player), 1);
  assert.equal(s.hp, 30);
  assert.equal(s.wolf, 30);
  assert.equal(s.stamina, 8);
  for (const invalid of [-1, 1.5, NaN, Infinity, 100]) {
    assert.throws(
      () => initialDeck(42, undefined, { player: invalid, wolf: 0 }),
      /Броня/,
    );
    assert.throws(
      () => initialDeck(42, undefined, { player: 0, wolf: invalid }),
      /Броня/,
    );
  }
  assert.equal(damageAfterArmor(6, 0), 6);
  assert.equal(damageAfterArmor(6, 2), 5);
  assert.equal(damageAfterArmor(6, 5), 4);
});

test("armored lethal damage stays capped at remaining health and skipping cannot revive", () => {
  const s = {
    ...initialDeck(42, undefined, { player: 5, wolf: 0 }),
    hp: 3.9,
    stamina: 0,
    wolfDeck: {
      hand: [{ uid: "w", action: "thrust" as const }],
      draw: [],
      discard: [],
      shuffles: 0,
    },
  };
  const r = calculateDeck(s, []);
  assert.equal(r.incoming, 3.9);
  assert.equal(r.hp, 0);
  assert.equal(r.stamina, 0);
  assert.equal(resolveDeck(s, []).result, "loss");
});
