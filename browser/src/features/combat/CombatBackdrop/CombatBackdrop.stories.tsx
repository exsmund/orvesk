import type { Meta, StoryObj } from "@storybook/react-vite";
import { CombatBackdrop } from "@/features/combat/CombatBackdrop/CombatBackdrop";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/CombatBackdrop",
  component: CombatBackdrop,
  args: {},
  argTypes: { journey: { control: "object" } },
  parameters: { componentName: "CombatBackdrop" },
} satisfies Meta<typeof CombatBackdrop>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CombatBackdrop" args={args} />,
};
