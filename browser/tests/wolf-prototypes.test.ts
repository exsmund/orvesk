import test from "node:test";
import assert from "node:assert/strict";
import {
  actions,
  hand,
  initial,
  intent,
  resolve,
  shapeCells,
} from "../stories/wolf-prototypes/model";

test("wolf experiments: deterministic deals with guaranteed defense and recovery", () => {
  assert.deepEqual(hand(42, 1), hand(42, 1));
  assert.equal(new Set(hand(42, 1)).size, 6);
  assert.ok(hand(42, 1).includes("guard") && hand(42, 1).includes("rest"));
  assert.notDeepEqual(hand(42, 1), hand(42, 1, 1));
});
test("wolf experiments: rotation respects board boundaries", () => {
  const dodge = actions.find((a) => a.id === "dodge")!;
  assert.equal(shapeCells(dodge, 0, 2), null);
  assert.deepEqual(shapeCells(dodge, 1, 2), [2, 5, 8]);
});
test("wolf experiments: dodge counters leap and cooldown lasts two turns", () => {
  const state = { ...initial(), round: 2 };
  const next = resolve(
    state,
    [{ id: "dodge", cells: intent(2, 42).cells }],
    "planning",
    42,
  );
  assert.equal(next.hp, 30);
  assert.equal(next.cooldowns.dodge, 2);
  const third = resolve(next, [], "planning", 42);
  assert.equal(third.cooldowns.dodge, 1);
  assert.throws(() =>
    resolve(third, [{ id: "dodge", cells: [0, 1, 2] }], "planning", 42),
  );
  assert.equal(resolve(third, [], "planning", 42).cooldowns.dodge, 0);
});
test("wolf experiments: recovery window doubles damage without mutating state", () => {
  const state = { ...initial(), round: 3 };
  const next = resolve(
    state,
    [{ id: "heavy", cells: [0, 1, 3] }],
    "planning",
    42,
  );
  assert.equal(next.wolf, 20);
  assert.equal(state.wolf, 40);
  assert.equal(next.energy, 3);
});
test("wolf experiments: energy, collisions and repeated figures cannot be bypassed", () => {
  assert.throws(() =>
    resolve(
      { ...initial(), energy: 1 },
      [{ id: "heavy", cells: [0, 1, 3] }],
      "planning",
      42,
    ),
  );
  assert.throws(() =>
    resolve(
      initial(),
      [
        { id: "guard", cells: [0, 1] },
        { id: "rest", cells: [1] },
      ],
      "planning",
      42,
    ),
  );
  assert.throws(() =>
    resolve(
      initial(),
      [
        { id: "rest", cells: [0] },
        { id: "rest", cells: [1] },
      ],
      "planning",
      42,
    ),
  );
});
test("wolf experiments: healing does not resurrect; ended fights are stable", () => {
  const dead = resolve(
    { ...initial(), hp: 1 },
    [{ id: "heal", cells: [0, 3] }],
    "planning",
    42,
  );
  assert.equal(dead.hp, 0);
  assert.equal(dead.result, "loss");
  assert.deepEqual(resolve(dead, [], "planning", 42), dead);
});
