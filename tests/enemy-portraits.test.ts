import test from "node:test";
import assert from "node:assert/strict";
import { createGame, generateEnemy } from "../src/game/combat/engine";
import { normalizeGame } from "../src/game/combat/tactics";
import { PORTRAITS, isPortraitId } from "../src/game/characters/portraits";

test("enemies sample varied valid portraits distinct from the player and keep them on reload", () => {
  const player = createGame("Портрет", () => 0.5).player;
  const seen = new Set<string>();
  for (const roll of [0.01, 0.15, 0.35, 0.55, 0.75, 0.99]) {
    const enemy = generateEnemy(player, () => roll);
    assert.ok(isPortraitId(enemy.portraitId));
    assert.notEqual(enemy.portraitId, player.portraitId);
    seen.add(enemy.portraitId!);
    const game = createGame("Портрет", () => 0.5);
    game.enemy = enemy;
    assert.equal(
      normalizeGame(JSON.parse(JSON.stringify(game))).enemy.portraitId,
      enemy.portraitId,
    );
  }
  assert.equal(seen.size, 6);
});

test("legacy portrait migration is stable and preserves both fighters and battle progress", () => {
  const game = createGame("Старый бой", () => 0.5, PORTRAITS[3].id);
  delete game.enemy.portraitId;
  game.enemy.hp = 3;
  game.round = 7;
  game.fight = 4;
  const before = structuredClone(game),
    a = normalizeGame(game),
    b = normalizeGame(game);
  assert.ok(isPortraitId(a.enemy.portraitId));
  assert.notEqual(a.enemy.portraitId, game.player.portraitId);
  assert.equal(a.enemy.portraitId, b.enemy.portraitId);
  assert.equal(normalizeGame(a).enemy.portraitId, a.enemy.portraitId);
  assert.deepEqual(game, before);
  assert.deepEqual(a.player, game.player);
  assert.deepEqual(
    { ...a.enemy, portraitId: undefined },
    { ...game.enemy, portraitId: undefined },
  );
  assert.equal(a.round, 7);
  assert.equal(a.fight, 4);
});
