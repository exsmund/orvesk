import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import itemArt from "../../data/item-art.json";
import baseFigures from "../../data/base-figures.json";
import skills from "../../data/skills.json";
import { figureArt } from "@/game/combat/figure-art";
import type { Maneuver } from "@/game/types";

function collectArt(value: unknown, paths: Set<string>) {
  if (Array.isArray(value)) value.forEach((v) => collectArt(v, paths));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (key === "art" && typeof v === "string") paths.add(v);
      else collectArt(v, paths);
    }
  }
}

test("all active item and action images are square PNGs with real transparent backgrounds", () => {
  const paths = new Set(Object.values(itemArt));
  for (const name of [
    "weapons",
    "armor",
    "jewelry",
    "base-figures",
    "creatures",
    "skills",
  ]) {
    collectArt(
      JSON.parse(
        readFileSync(new URL(`../../data/${name}.json`, import.meta.url), "utf8"),
      ),
      paths,
    );
  }
  for (const path of paths) {
    assert.match(
      path,
      /^\/(items|actions|creatures\/actions|skills)\/[a-z0-9-]+\.png$/,
      path,
    );
    const png = readFileSync(new URL(`../../public${path}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", path);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.equal(width, height, path);
    assert.ok(width >= 1024, path);
    assert.equal(png[24], 8, `${path}: 8-bit PNG`);
    assert.equal(png[25], 6, `${path}: RGBA required`);
    assert.equal(png[28], 0, `${path}: non-interlaced PNG`);
    const chunks: Buffer[] = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      if (png.toString("ascii", offset + 4, offset + 8) === "IDAT")
        chunks.push(png.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    const raw = inflateSync(Buffer.concat(chunks));
    const stride = width * 4;
    assert.equal(raw.length, height * (stride + 1), path);
    let previous = new Uint8Array(stride);
    let transparent = 0;
    let visible = 0;
    for (let y = 0; y < height; y++) {
      const offset = y * (stride + 1);
      const filter = raw[offset];
      assert.ok(filter <= 4, path);
      const row = new Uint8Array(raw.subarray(offset + 1, offset + stride + 1));
      for (let x = 0; x < stride; x++) {
        const a = x >= 4 ? row[x - 4] : 0;
        const b = previous[x];
        const c = x >= 4 ? previous[x - 4] : 0;
        let predictor = 0;
        if (filter === 1) predictor = a;
        else if (filter === 2) predictor = b;
        else if (filter === 3) predictor = Math.floor((a + b) / 2);
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a),
            pb = Math.abs(p - b),
            pc = Math.abs(p - c);
          predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        row[x] = (row[x] + predictor) & 255;
      }
      for (let x = 3; x < stride; x += 4) {
        if (row[x] === 0) transparent++;
        if (row[x] >= 200) visible++;
      }
      if (y === 0 || y === height - 1) {
        assert.ok(row[3] <= 1, `${path}: transparent corner`);
        assert.ok(row[stride - 1] <= 1, `${path}: transparent corner`);
      }
      previous = row;
    }
    assert.ok(
      transparent > width * height * 0.1,
      `${path}: background must be transparent`,
    );
    assert.ok(
      visible > width * height * 0.01,
      `${path}: subject must remain visible`,
    );
  }
});

test("guard has distinct art and every skill owns its image path", () => {
  const guard = baseFigures.find((figure) => figure.id === "guard")!;
  const fist = baseFigures.find((figure) => figure.id === "fist")!;
  assert.notEqual(guard.art, fist.art);
  for (const skill of skills) {
    assert.ok("art" in skill && typeof skill.art === "string", skill.id);
    assert.ok(!("artId" in skill), skill.id);
  }
});

test("saved cards resolve current artwork without modifying combat snapshots", () => {
  const guard = {
    id: "base:guard#2",
    templateId: "base:guard",
    art: "/items/fist.png",
    staminaCost: 17,
  } as Maneuver;
  const before = structuredClone(guard);
  assert.equal(
    figureArt(guard),
    baseFigures.find((f) => f.id === "guard")?.art,
  );
  assert.deepEqual(guard, before);
  const weapon = {
    id: "dagger@3:strike-1#1",
    weaponId: "dagger@3",
    art: "/items/dagger.png",
  } as Maneuver;
  assert.equal(figureArt(weapon), itemArt.dagger);
  const unknown = { id: "external-figure", art: "/custom.png" } as Maneuver;
  assert.equal(figureArt(unknown), "/custom.png");
});
