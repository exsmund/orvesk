import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import ts from "typescript";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}
test("components have named implementation files and colocated styles", () => {
  for (const file of files("src")) {
    if (file.endsWith(".tsx") && !file.endsWith(".stories.tsx")) {
      assert.notEqual(basename(file), "index.tsx");
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const components = source.statements.filter(
        (node) =>
          ts.isFunctionDeclaration(node) &&
          node.name &&
          /^[A-Z]/.test(node.name.text),
      );
      assert.ok(components.length <= 1, `Several components in ${file}`);
      for (const node of components) {
        if (ts.isFunctionDeclaration(node))
          assert.equal(basename(file, ".tsx"), node.name!.text);
      }
    }
    if (file.endsWith(".css") && !file.startsWith("src/app/styles/")) {
      assert.ok(
        existsSync(file.replace(/\.css$/, ".tsx")),
        `Style file without component: ${file}`,
      );
    }
    if (file.endsWith("/index.ts")) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      assert.ok(
        source.statements.every(ts.isExportDeclaration),
        `Entrypoint contains implementation: ${file}`,
      );
    }
  }
});
