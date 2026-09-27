import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResourceBar } from "@/shared/ui/ResourceBar/ResourceBar";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/ResourceBar",
  component: ResourceBar,
  args: {},
  argTypes: {
    value: { control: "number" },
    change: { control: "number" },
    max: { control: "number" },
    kind: { control: "select", options: ["health", "stamina"] },
    compact: { control: "boolean" },
    effect: { control: "select", options: ["plasma", "smoke", "flame"] },
    label: { control: "text" },
  },
  parameters: { componentName: "ResourceBar" },
} satisfies Meta<typeof ResourceBar>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ResourceBar" args={args} />,
};
