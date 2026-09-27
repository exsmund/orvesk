import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterHome } from "@/features/characters/CharacterHome/CharacterHome";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/CharacterHome",
  component: CharacterHome,
  args: {},
  argTypes: {
    onOpen: { action: "onOpen", control: false },
    onCreate: { action: "onCreate", control: false },
    onBack: { action: "onBack", control: false },
    onDelete: { action: "onDelete", control: false },
    load: { action: "load", control: false },
    storage: { control: "object" },
  },
  parameters: { componentName: "CharacterHome" },
} satisfies Meta<typeof CharacterHome>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CharacterHome" args={args} />,
};
