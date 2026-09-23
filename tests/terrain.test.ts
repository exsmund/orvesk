import test from "node:test";
import assert from "node:assert/strict";
import { rockRegions } from "../src/game/combat/terrain";

test("every pair joins exactly when it shares a side", () => {
  for (let a = 0; a < 9; a++)
    for (let b = a + 1; b < 9; b++) {
      const adjacent =
        Math.abs((a % 3) - (b % 3)) +
          Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) ===
        1;
      const regions = rockRegions([a, b]);
      assert.equal(regions.length, adjacent ? 1 : 2, `${a},${b}`);
      if (adjacent)
        assert.equal(
          regions[0].texture,
          b - a === 1 ? "rock-horizontal.png" : "rock-vertical.png",
        );
    }
});
test("either side unlocking a rock breaks the region apart", () => {
  assert.deepEqual(
    rockRegions([0, 1, 2], [1]).map((r) => r.cells),
    [[0], [2]],
  );
  assert.deepEqual(rockRegions([0, 1], [0, 1]), []);
  assert.equal(rockRegions([0, 1], [undefined, 0])[0].texture, "rock.png");
});
test("corners form a single region without including the empty corner", () => {
  const [r] = rockRegions([0, 1, 3]);
  assert.deepEqual(r.cells, [0, 1, 3]);
  assert.equal(r.width, 2);
  assert.equal(r.height, 2);
});
