import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/CharacterPortrait",
  component: CharacterPortrait,
  args: { size: "large" },
  argTypes: {
    src: { control: "text" },
    dead: { control: "boolean" },
    side: { control: "select", options: ["player", "enemy"] },
    size: { control: "select", options: ["large", "small"] },
    alt: { control: "text" },
    label: { control: "text" },
    title: { control: "text" },
    onClick: { action: "onClick", control: false },
    loading: { control: "select", options: ["lazy", "eager"] },
  },
  parameters: { componentName: "CharacterPortrait" },
} satisfies Meta<typeof CharacterPortrait>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="CharacterPortrait" args={args} />,
};
