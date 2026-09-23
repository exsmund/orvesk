import ts from "typescript";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { extname } from "node:path";
const root = process.cwd();
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
}
const sources = files("src").filter((p) => /\.tsx?$/.test(p)),
  tests = files("tests").filter((p) => /\.tsx?$/.test(p));
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([...sources, ...tests], parsed.options),
  checker = program.getTypeChecker();
type Entry = {
  name: string;
  file: string;
  line: number;
  exported: boolean;
  uses: { file: string; line: number; owner: string | null }[];
  active: boolean;
};
const entries: Entry[] = [],
  symbols = new Map<ts.Symbol, Entry>(),
  nodes = new Map<ts.Node, Entry>();
for (const path of sources.filter((p) => p.endsWith(".tsx"))) {
  const sf = program.getSourceFile(path)!;
  function walk(n: ts.Node) {
    if (ts.isFunctionDeclaration(n) && n.name && /^[A-Z]/.test(n.name.text)) {
      let jsx = false;
      function scan(child: ts.Node) {
        if (
          ts.isJsxElement(child) ||
          ts.isJsxSelfClosingElement(child) ||
          ts.isJsxFragment(child)
        )
          jsx = true;
        ts.forEachChild(child, scan);
      }
      if (n.body) scan(n.body);
      if (jsx) {
        const e: Entry = {
          name: n.name.text,
          file: path,
          line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
          exported: !!n.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword,
          ),
          uses: [],
          active: false,
        };
        entries.push(e);
        nodes.set(n, e);
        const symbol = checker.getSymbolAtLocation(n.name);
        if (symbol) symbols.set(symbol, e);
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(sf);
}
for (const path of [...sources, ...tests]) {
  const sf = program.getSourceFile(path)!;
  function walk(n: ts.Node) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      let symbol = checker.getSymbolAtLocation(n.tagName);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias)
        symbol = checker.getAliasedSymbol(symbol);
      const entry = symbol && symbols.get(symbol);
      if (entry) {
        let parent: ts.Node | undefined = n.parent,
          owner: Entry | undefined;
        while (parent && !owner) {
          owner = nodes.get(parent);
          parent = parent.parent;
        }
        entry.uses.push({
          file: path,
          line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
          owner: owner ? `${owner.file}#${owner.name}` : null,
        });
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(sf);
}
const active = new Set(["src/app/App.tsx#App"]);
let changed = true;
while (changed) {
  changed = false;
  for (const e of entries)
    if (
      !active.has(`${e.file}#${e.name}`) &&
      e.uses.some(
        (u) => u.file.startsWith("src/") && u.owner && active.has(u.owner),
      )
    ) {
      active.add(`${e.file}#${e.name}`);
      changed = true;
    }
}
entries.forEach((e) => (e.active = active.has(`${e.file}#${e.name}`)));
const textFiles = [
  ...sources,
  ...files("src").filter((p) => p.endsWith(".css")),
  ...files("data").filter(
    (p) => !p.startsWith("data/sessions/") && p.endsWith(".json"),
  ),
  "index.html",
].map((file) => ({ file, text: readFileSync(file, "utf8") }));
const assets = ["public", "assets", "refs"].flatMap(files).map((file) => {
  const url = file.startsWith("public/")
    ? `/${file.slice(7)}`
    : `/__project_assets/${file}`;
  const search = file.startsWith("public/") ? url : file;
  const uses = textFiles.flatMap(({ file: source, text }) =>
    text
      .split("\n")
      .flatMap((line, i) =>
        line.includes(search) ? [{ file: source, line: i + 1 }] : [],
      ),
  );
  return {
    file,
    url,
    bytes: statSync(file).size,
    extension: extname(file).toLowerCase(),
    uses,
  };
});
mkdirSync("stories/generated", { recursive: true });
writeFileSync(
  "stories/generated/catalog.json",
  JSON.stringify({ components: entries, assets }, null, 2) + "\n",
);
for (const file of files("stories/generated").filter((file) =>
  file.endsWith(".stories.tsx"),
))
  unlinkSync(file);
const exported = entries.filter((e) => e.exported && e.name !== "App");
const groups: Record<string, string> = {
  characters: "Персонажи",
  combat: "Бой",
  equipment: "Экипировка",
  journey: "Путешествие",
  rewards: "Награды",
  skills: "Навыки",
  home: "Главный экран",
};
for (const e of exported) {
  const group = e.file.startsWith("src/shared/")
    ? "Общие"
    : (groups[e.file.split("/")[2]] ?? "Прочее");
  writeFileSync(
    `stories/generated/${e.name}.stories.tsx`,
    `import type {Meta,StoryObj} from '@storybook/react-vite';\nimport {Example} from '../examples';\nconst meta={title:${JSON.stringify(`Компоненты/${group}/${e.name}`)},parameters:{componentName:${JSON.stringify(e.name)}}} satisfies Meta;\nexport default meta;\nexport const Preview:StoryObj<typeof meta>={name:'Пример',render:()=> <Example name=${JSON.stringify(e.name)}/>};\n`,
  );
}
console.log(
  `Каталог: ${entries.length} компонентов (${entries.filter((e) => !e.active).length} вне дерева App), ${assets.length} ассетов, ${exported.length} интерактивных примеров.`,
);
