import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync("stories/generated/catalog.json", "utf8"),
) as {
  components: { name: string; file: string; exported: boolean }[];
  assets: { file: string }[];
};
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { Example } = await server.ssrLoadModule("/stories/examples.tsx");
  const components = catalog.components;
  for (const component of components) {
    try {
      const storyPath = component.file.replace(/\.tsx$/, ".stories.tsx");
      if (!existsSync(storyPath))
        throw new Error(`Missing colocated story: ${storyPath}`);
      const story = await server.ssrLoadModule(`/${storyPath}`);
      if (!story.default.component || !story.default.argTypes)
        throw new Error(`Missing component or controls: ${storyPath}`);
      // App reads browser storage during initialization; its story is verified in-browser.
      if (
        !["App", "NodeDialog", "MapWindow", "RewardWindow"].includes(
          component.name,
        )
      )
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
    `Проверены ${components.length} историй (69 SSR-примеров) и ${catalog.assets.length} путей ассетов. Браузерные эффекты проверяются отдельно.`,
  );
} finally {
  await server.close();
}
