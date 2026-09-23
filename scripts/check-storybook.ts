import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync("stories/generated/catalog.json", "utf8"),
) as {
  components: { name: string; exported: boolean }[];
  assets: { file: string }[];
};
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { Example } = await server.ssrLoadModule("/stories/examples.tsx");
  const components = catalog.components.filter(
    (c) => c.exported && c.name !== "App",
  );
  for (const component of components) {
    try {
      renderToString(createElement(Example, { name: component.name }));
    } catch (error) {
      throw new Error(`Пример ${component.name} не отрисовался`, {
        cause: error,
      });
    }
  }
  for (const asset of catalog.assets)
    if (!existsSync(asset.file))
      throw new Error(`Ассет отсутствует: ${asset.file}`);
  console.log(
    `Проверены ${components.length} примеров и ${catalog.assets.length} путей ассетов. Браузерные эффекты проверяются отдельно.`,
  );
} finally {
  await server.close();
}
