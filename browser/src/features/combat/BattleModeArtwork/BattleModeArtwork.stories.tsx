import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleModeArtwork } from "@/features/combat/BattleModeArtwork/BattleModeArtwork";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/BattleModeArtwork",
  component: BattleModeArtwork,
  args: {},
  argTypes: {
    mode: { control: "select", options: ["free", "expendable"] },
    size: { control: "select", options: ["icon", "dialog"] },
    decorative: { control: "boolean" },
  },
  parameters: { componentName: "BattleModeArtwork" },
} satisfies Meta<typeof BattleModeArtwork>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleModeArtwork" args={args} />,
};
