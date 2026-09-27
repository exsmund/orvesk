import type { Meta, StoryObj } from "@storybook/react-vite";
import { RewardArt } from "@/features/rewards/VictoryRewardDialog/RewardArt";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/rewards/VictoryRewardDialog/RewardArt",
  component: RewardArt,
  args: {},
  argTypes: { reward: { control: "object" } },
  parameters: { componentName: "RewardArt" },
} satisfies Meta<typeof RewardArt>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="RewardArt" args={args} />,
};
