import type { Meta, StoryObj } from "@storybook/react-vite";
import { FloatingDamage } from "@/features/combat/FloatingDamage/FloatingDamage";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/FloatingDamage",
  component: FloatingDamage,
  args: { amount: 4 },
  argTypes: { amount: { control: "number" } },
  parameters: { componentName: "FloatingDamage" },
} satisfies Meta<typeof FloatingDamage>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="FloatingDamage" args={args} />,
};
