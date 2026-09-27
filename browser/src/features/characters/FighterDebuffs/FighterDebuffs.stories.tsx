import type { Meta, StoryObj } from "@storybook/react-vite";
import { FighterDebuffs } from "@/features/characters/FighterDebuffs/FighterDebuffs";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/FighterDebuffs",
  component: FighterDebuffs,
  args: {},
  argTypes: {
    fighter: { control: "object" },
    onOpen: { action: "onOpen", control: false },
  },
  parameters: { componentName: "FighterDebuffs" },
} satisfies Meta<typeof FighterDebuffs>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="FighterDebuffs" args={args} />,
};
