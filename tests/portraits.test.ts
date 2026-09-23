import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
  createGame,
  nextBattle,
  claimReward,
  resolveTurn,
} from "../src/game/combat/engine";
import {
  DEFAULT_PORTRAIT_ID,
  PORTRAITS,
  isPortraitId,
  portrait,
} from "../src/game/characters/portraits";

test("35 unique portrait options are backed by public image files", async () => {
  assert.equal(PORTRAITS.length, 35);
  assert.equal(new Set(PORTRAITS.map((p) => p.id)).size, PORTRAITS.length);
  assert.equal(new Set(PORTRAITS.map((p) => p.src)).size, PORTRAITS.length);
  for (const p of PORTRAITS) {
    assert.match(p.src, /^\/portraits\/character-[a-z0-9-]+\.png$/);
    await access(new URL(`../public${p.src}`, import.meta.url));
  }
});

test("portrait choice survives turns, reward, next battle and serialization without changing stats", () => {
  for (const p of PORTRAITS) {
    let game = createGame("Лицо", () => 0.5, p.id);
    assert.equal(game.player.portraitId, p.id);
    assert.deepEqual(Object.values(game.player.stats), [1, 1, 1, 1, 1]);
    assert.deepEqual(Object.values(game.player.gear), [null, null, null, null]);
    game = resolveTurn(game, { action: "attack", step: 1 }, () => 0.5);
    assert.equal(game.player.portraitId, p.id);
    game.phase = "victory";
    game.reward = { kind: "souls", amount: 2 };
    game = claimReward(game, "souls");
    game = nextBattle(JSON.parse(JSON.stringify(game)), () => 0.5);
    assert.equal(game.player.portraitId, p.id);
  }
});

test("unknown IDs and path injection are rejected; old saves get a display fallback", () => {
  for (const bad of [
    "../refs/image1.png",
    "/portraits/other.png",
    "fake",
    17,
    null,
  ])
    assert.equal(isPortraitId(bad), false);
  assert.throws(() => createGame("Лицо", () => 0.5, "fake"), /портрет/);
  const game = createGame("Старый");
  delete game.player.portraitId;
  assert.equal(portrait(game.player.portraitId).id, DEFAULT_PORTRAIT_ID);
  assert.doesNotThrow(() => resolveTurn(game, { action: "attack", step: 1 }));
});
