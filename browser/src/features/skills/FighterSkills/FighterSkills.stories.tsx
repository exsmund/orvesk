import type { Meta, StoryObj } from "@storybook/react-vite";
import { FighterSkills } from "@/features/skills/FighterSkills/FighterSkills";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/skills/FighterSkills",
  component: FighterSkills,
  args: {},
  argTypes: { fighter: { control: "object" } },
  parameters: { componentName: "FighterSkills" },
} satisfies Meta<typeof FighterSkills>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="FighterSkills" args={args} />,
};
