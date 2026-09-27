import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx", "../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  staticDirs: [
    "../../public",
    "../public",
    { from: "../../art-prompts", to: "/__project_assets/art-prompts" },
    { from: "../../refs", to: "/__project_assets/refs" },
  ],
  core: { disableTelemetry: true },
};
export default config;
