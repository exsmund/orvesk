import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { browserPublic } from "./scripts/browser-public";
export default defineConfig({
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  resolve: {
    alias: {
      "@/game": fileURLToPath(new URL("../src/game", import.meta.url)),
      "@/app/styles/palette.css": fileURLToPath(
        new URL("../src/app/styles/palette.css", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), browserPublic()],
  server: {
    host: "0.0.0.0",
    fs: {
      allow: [fileURLToPath(new URL("..", import.meta.url))],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/data/sessions/**",
      ],
    },
  },
});
