import type { Meta, StoryObj } from "@storybook/react-vite";
import { CombatMenu } from "@/features/combat/CombatMenu/CombatMenu";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/CombatMenu",
  component: CombatMenu,
  args: { busy: false },
  argTypes: {
    busy: { control: "boolean" },
    onHome: { action: "onHome", control: false },
    onMap: { action: "onMap", control: false },
    onRules: { action: "onRules", control: false },
  },
  parameters: { componentName: "CombatMenu" },
} satisfies Meta<typeof CombatMenu>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CombatMenu" args={args} />,
};
