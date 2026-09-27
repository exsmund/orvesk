import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterCard } from "@/features/characters/CharacterCard/CharacterCard";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/characters/CharacterCard",
  component: CharacterCard,
  args: { souls: 12, busy: false, canUpgrade: true },
  argTypes: {
    fighter: { control: "object" },
    souls: { control: "number" },
    busy: { control: "boolean" },
    canUpgrade: { control: "boolean" },
    onUpgrade: { action: "onUpgrade", control: false },
    onInspect: { action: "onInspect", control: false },
    close: { action: "close", control: false },
    onHome: { action: "onHome", control: false },
    onRules: { action: "onRules", control: false },
    onMap: { action: "onMap", control: false },
    preview: { control: "object" },
  },
  parameters: { componentName: "CharacterCard" },
} satisfies Meta<typeof CharacterCard>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CharacterCard" args={args} />,
};
