import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleWorkspace } from "@/features/combat/BattleWorkspace/BattleWorkspace";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/BattleWorkspace",
  component: BattleWorkspace,
  args: {},
  argTypes: {
    hint: { control: "text" },
    children: { control: "text" },
    below: { control: "object" },
  },
  parameters: { componentName: "BattleWorkspace" },
} satisfies Meta<typeof BattleWorkspace>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleWorkspace" args={args} />,
};
