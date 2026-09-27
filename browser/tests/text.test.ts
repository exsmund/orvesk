import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
test("visible native text elements use the shared Text component", () => {
  const textTags = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "small",
    "em",
    "dt",
    "dd",
    "legend",
    "figcaption",
    "label",
    "summary",
  ]);
  for (const file of files("src").filter(
    (file) => file.endsWith(".tsx") && !file.endsWith(".stories.tsx"),
  )) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node))
        assert.ok(
          !textTags.has(node.tagName.getText(source)),
          `Use Text as= in ${file}: ${node.tagName.getText(source)}`,
        );
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});
