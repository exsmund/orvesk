import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sources(path)
      : /\.(css|tsx?)$/.test(path)
        ? [path]
        : [];
  });
}
test("UI colors are defined in the shared palette and references resolve", () => {
  const path = "../src/app/styles/palette.css";
  const palette = readFileSync(path, "utf8");
  const tokens = Array.from(
    palette.matchAll(/(--color-[\w-]+):/g),
    (match) => match[1],
  );
  assert.equal(
    new Set(tokens).size,
    tokens.length,
    "Palette tokens must be unique",
  );
  for (const token of tokens)
    assert.match(
      token,
      /^--color-(base|text|background|border|shadow|effect)-[\w-]+$/,
      `Missing purpose group: ${token}`,
    );
  const known = new Set(tokens);
  for (const file of [...sources("src"), ...sources("stories")]) {
    if (file === path) continue;
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /#[\da-f]{3,8}\b|\b0x[\da-f]{6}\b|\brgba?\(\s*[\d.]|\bhsla?\(\s*[\d.]/i,
      `Literal color outside palette: ${file}`,
    );
    for (const match of source.matchAll(/(?<![\w-])(--color-[\w-]+)/g)) {
      assert.ok(known.has(match[1]), `Unknown token ${match[1]} in ${file}`);
    }
  }
});

test("text palette exactly matches the explicit Text color variants", () => {
  const model = readFileSync("src/shared/ui/Text/model.ts", "utf8");
  const variants = [
    ...model
      .split("export type TextColor =")[1]
      .split(";")[0]
      .matchAll(/"([^"\n]+)"/g),
  ]
    .map((match) => match[1])
    .filter((name) => name !== "inherit")
    .sort();
  const palette = readFileSync("../src/app/styles/palette.css", "utf8");
  const tokens = [...palette.matchAll(/--color-text-([\w-]+):/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(tokens, variants);
});
