import express from "express";
import { cpSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/** Overlay browser-only assets on the shared public directory without moving shared files. */
export function browserPublic(): Plugin {
  const local = fileURLToPath(new URL("../public", import.meta.url));
  const shared = fileURLToPath(new URL("../../public", import.meta.url));
  let output = "";
  return {
    name: "browser-public",
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
      for (const file of readdirSync(local, {
        recursive: true,
        withFileTypes: true,
      })) {
        if (!file.isFile()) continue;
        const relative = resolve(file.parentPath, file.name).slice(
          local.length + 1,
        );
        if (existsSync(resolve(shared, relative)))
          throw new Error(`Duplicate public asset: ${relative}`);
      }
    },
    configureServer(server) {
      const app = express();
      app.use(express.static(local));
      server.middlewares.use(app);
    },
    writeBundle() {
      cpSync(local, output, { recursive: true });
    },
  };
}
