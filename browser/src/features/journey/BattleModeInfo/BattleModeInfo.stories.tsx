import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleModeInfo } from "@/features/journey/BattleModeInfo/BattleModeInfo";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/BattleModeInfo",
  component: BattleModeInfo,
  args: {},
  argTypes: { game: { control: "object" }, compact: { control: "boolean" } },
  parameters: { componentName: "BattleModeInfo" },
} satisfies Meta<typeof BattleModeInfo>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleModeInfo" args={args} />,
};
