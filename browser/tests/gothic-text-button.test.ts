import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : [file];
  });
}

test("GothicTextButton consumers use its API rather than custom styles", () => {
  for (const file of [
    ...sources("src"),
    ...sources("stories"),
    ...sources("tests"),
  ]) {
    if (!file.endsWith(".tsx")) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node) {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(source) === "GothicTextButton"
      ) {
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop))
            assert.ok(
              !["className", "style"].includes(prop.name.getText(source)),
              `${file}: use button variants instead of ${prop.name.getText(source)}`,
            );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("GothicTextButton selectors belong to its stylesheet; other styles may only exclude it", () => {
  for (const file of [...sources("src"), ...sources("stories")]) {
    if (!file.endsWith(".css") || file.endsWith("GothicTextButton.css"))
      continue;
    const css = readFileSync(file, "utf8").replaceAll(
      ":where(:not(.gothic-text-button))",
      "",
    );
    assert.doesNotMatch(css, /\.gothic-text-(?:button|label)/, file);
  }
});
