import type { Meta, StoryObj } from "@storybook/react-vite";
import { RewardWindow } from "@/features/rewards/VictoryRewardDialog/RewardWindow";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/rewards/VictoryRewardDialog/RewardWindow",
  component: RewardWindow,
  args: { title: "Награда" },
  argTypes: {
    title: { control: "text" },
    cancel: { action: "cancel", control: false },
    footer: { control: "object" },
    hint: { control: "object" },
    children: { control: "text" },
  },
  parameters: { componentName: "RewardWindow" },
} satisfies Meta<typeof RewardWindow>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="RewardWindow" args={args} />,
};
