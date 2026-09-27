import type { Meta, StoryObj } from "@storybook/react-vite";
import { Resources } from "@/features/combat/Resources/Resources";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/Resources",
  component: Resources,
  args: {},
  argTypes: { fighter: { control: "object" }, preview: { control: "object" } },
  parameters: { componentName: "Resources" },
} satisfies Meta<typeof Resources>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Resources" args={args} />,
};
