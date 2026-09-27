import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterCreation } from "@/features/characters/CharacterCreation/CharacterCreation";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/CharacterCreation",
  component: CharacterCreation,
  args: {},
  argTypes: {
    onClose: { action: "onClose", control: false },
    onCreate: { action: "onCreate", control: false },
    busy: { control: "boolean" },
    error: { control: "text" },
  },
  parameters: { componentName: "CharacterCreation" },
} satisfies Meta<typeof CharacterCreation>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CharacterCreation" args={args} />,
};
