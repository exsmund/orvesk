import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createGame, nextBattle, claimReward } from "@/game/combat/engine";
import { beginClash } from "@/game/combat/reaction-engine";
import {
  DEFAULT_PORTRAIT_ID,
  PORTRAITS,
  isPortraitId,
  portrait,
} from "@/game/characters/portraits";

test("25 unique portrait options use only the current hero series", async () => {
  assert.equal(PORTRAITS.length, 25);
  assert.equal(
    PORTRAITS.filter((p) => p.src.startsWith("/portraits/heroes-v2/")).length,
    25,
  );
  assert.equal(new Set(PORTRAITS.map((p) => p.id)).size, PORTRAITS.length);
  assert.equal(new Set(PORTRAITS.map((p) => p.src)).size, PORTRAITS.length);
  for (const p of PORTRAITS) {
    assert.match(p.src, /^\/portraits\/heroes-v2\/character-[a-z0-9-]+\.png$/);
    await access(new URL(`../../public${p.src}`, import.meta.url));
  }
});

test("portrait choice survives turns, reward, next battle and serialization without changing stats", () => {
  for (const p of PORTRAITS) {
    let game = createGame("Лицо", () => 0.5, p.id);
    assert.equal(game.player.portraitId, p.id);
    assert.deepEqual(Object.values(game.player.stats), [1, 1, 1, 1]);
    assert.deepEqual(Object.values(game.player.gear), [null, null, null, null]);
    game = beginClash(game, () => 0.5);
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
    "../../refs/image1.png",
    "/portraits/other.png",
    "fake",
    "character-01-ash",
    "character-35-lichen",
    17,
    null,
  ])
    assert.equal(isPortraitId(bad), false);
  assert.throws(() => createGame("Лицо", () => 0.5, "fake"), /портрет/);
  assert.equal(portrait("character-01-ash").id, DEFAULT_PORTRAIT_ID);
  const game = createGame("Старый");
  delete game.player.portraitId;
  assert.equal(portrait(game.player.portraitId).id, DEFAULT_PORTRAIT_ID);
  assert.doesNotThrow(() => beginClash(game));
});
