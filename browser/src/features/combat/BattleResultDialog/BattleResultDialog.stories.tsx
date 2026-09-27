import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleResultDialog } from "@/features/combat/BattleResultDialog/BattleResultDialog";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/BattleResultDialog",
  component: BattleResultDialog,
  args: {},
  argTypes: {
    game: { control: "object" },
    onClose: { action: "onClose", control: false },
  },
  parameters: { componentName: "BattleResultDialog" },
} satisfies Meta<typeof BattleResultDialog>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleResultDialog" args={args} />,
};
