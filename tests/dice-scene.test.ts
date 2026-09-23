import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import {
  DIE_NORMALS,
  createDieGeometry,
  landingRotation,
} from "../src/features/combat/dice-scene";
for (let value = 1; value <= 6; value++) {
  test(`server result ${value} lands with that face pointing up`, () => {
    const rotation = landingRotation(value);
    const top = new Vector3(...DIE_NORMALS[value - 1]).applyQuaternion(
      rotation,
    );
    assert.ok(top.distanceTo(new Vector3(0, 1, 0)) < 1e-10);
    const opposite = new Vector3(...DIE_NORMALS[6 - value]).applyQuaternion(
      rotation,
    );
    assert.ok(opposite.distanceTo(new Vector3(0, -1, 0)) < 1e-10);
  });
}
test("rejects invalid server dice values", () => {
  for (const value of [0, 7, 1.5, NaN])
    assert.throws(() => landingRotation(value));
});

test("pips are recessed into all six faces without protruding beyond the body", () => {
  const geometry = createDieGeometry();
  try {
    const positions = geometry.getAttribute("position");
    for (const normal of DIE_NORMALS) {
      const direction = new Vector3(...normal);
      let recessed = 0;
      for (let i = 0; i < positions.count; i++) {
        const point = new Vector3().fromBufferAttribute(positions, i);
        assert.ok(
          Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)) <=
            0.600001,
        );
        const distance = point.dot(direction);
        const tangent = point.clone().addScaledVector(direction, -distance);
        if (tangent.length() < 0.45 && distance > 0.54 && distance < 0.57)
          recessed++;
      }
      assert.ok(recessed > 0, `Missing pip cavities on face ${normal}`);
    }
  } finally {
    geometry.dispose();
  }
});

test("the single pip stays hemispherical with subtle neutral cavity shading", () => {
  const geometry = createDieGeometry();
  try {
    const colors = geometry.getAttribute("color");
    for (let i = 0; i < colors.count; i++) {
      assert.equal(colors.getX(i), colors.getY(i));
      assert.equal(colors.getY(i), colors.getZ(i));
      assert.ok(colors.getX(i) >= 0.8 && colors.getX(i) <= 1);
    }
    const positions = geometry.getAttribute("position");
    let samples = 0;
    for (let i = 0; i < positions.count; i++) {
      const point = new Vector3().fromBufferAttribute(positions, i);
      const radius = Math.hypot(point.x, point.z);
      if (point.y > 0 && radius < 0.115) {
        const depth = 0.6 - point.y;
        assert.ok(
          Math.abs(radius * radius + depth * depth - 0.115 ** 2) < 1e-7,
        );
        samples++;
      }
    }
    assert.ok(samples > 20);
  } finally {
    geometry.dispose();
  }
});
