import type { Meta, StoryObj } from "@storybook/react-vite";
import { RockTerrain } from "@/features/combat/RockTerrain/RockTerrain";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/RockTerrain",
  component: RockTerrain,
  args: {},
  argTypes: { blocked: { control: "object" }, unlocked: { control: "object" } },
  parameters: { componentName: "RockTerrain" },
} satisfies Meta<typeof RockTerrain>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="RockTerrain" args={args} />,
};
