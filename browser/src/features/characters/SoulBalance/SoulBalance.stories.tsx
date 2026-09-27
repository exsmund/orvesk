import type { Meta, StoryObj } from "@storybook/react-vite";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/SoulBalance",
  component: SoulBalance,
  args: {},
  argTypes: { amount: { control: "number" } },
  parameters: { componentName: "SoulBalance" },
} satisfies Meta<typeof SoulBalance>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="SoulBalance" args={args} />,
};
