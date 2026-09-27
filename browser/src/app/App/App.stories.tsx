import type { Meta, StoryObj } from "@storybook/react-vite";
import { App } from "@/app/App/App";
import { Example } from "../../../stories/examples";
const meta = {
  title: "src/app/App",
  component: App,
  args: {},
  argTypes: {},
  parameters: { componentName: "App" },
} satisfies Meta<typeof App>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="App" args={args} />,
};
