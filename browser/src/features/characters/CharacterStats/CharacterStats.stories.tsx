import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterStats } from "@/features/characters/CharacterStats/CharacterStats";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/CharacterStats",
  component: CharacterStats,
  args: {},
  argTypes: {
    fighter: { control: "object" },
    souls: { control: "number" },
    busy: { control: "boolean" },
    onUpgrade: { action: "onUpgrade", control: false },
    requirements: { control: "object" },
  },
  parameters: { componentName: "CharacterStats" },
} satisfies Meta<typeof CharacterStats>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CharacterStats" args={args} />,
};
