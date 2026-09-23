import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  staticDirs: [
    "../public",
    { from: "../assets", to: "/__project_assets/assets" },
    { from: "../refs", to: "/__project_assets/refs" },
  ],
  core: { disableTelemetry: true },
};
export default config;
