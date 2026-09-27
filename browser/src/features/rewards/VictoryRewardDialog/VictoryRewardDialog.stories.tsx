import type { Meta, StoryObj } from "@storybook/react-vite";
import { VictoryRewardDialog } from "@/features/rewards/VictoryRewardDialog/VictoryRewardDialog";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/rewards/VictoryRewardDialog",
  component: VictoryRewardDialog,
  args: { busy: false },
  argTypes: {
    game: { control: "object" },
    busy: { control: "boolean" },
    index: { control: "number" },
    onSelect: { action: "onSelect", control: false },
    onClaim: { action: "onClaim", control: false },
    onSpend: { action: "onSpend", control: false },
    error: { control: "text" },
  },
  parameters: { componentName: "VictoryRewardDialog" },
} satisfies Meta<typeof VictoryRewardDialog>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="VictoryRewardDialog" args={args} />,
};
