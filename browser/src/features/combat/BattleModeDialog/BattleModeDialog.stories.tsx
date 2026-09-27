import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleModeDialog } from "@/features/combat/BattleModeDialog/BattleModeDialog";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/BattleModeDialog",
  component: BattleModeDialog,
  args: { mode: "expendable" },
  argTypes: {
    mode: { control: "select", options: ["free", "expendable"] },
    onContinue: { action: "onContinue", control: false },
  },
  parameters: { componentName: "BattleModeDialog" },
} satisfies Meta<typeof BattleModeDialog>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleModeDialog" args={args} />,
};
