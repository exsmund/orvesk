import type { Meta, StoryObj } from "@storybook/react-vite";
import { CellPopup } from "@/features/combat/CellPopup";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/CellPopup",
  component: CellPopup,
  argTypes: {
    anchor: { control: false },
    onClose: { action: "close" },
    player: { control: "object" },
    enemy: { control: "object" },
    rotation: { control: "number" },
    compressed: { control: "boolean" },
    rock: { control: "boolean" },
    special: { control: "text" },
    damage: { control: "object" },
  },
  parameters: { componentName: "CellPopup" },
} satisfies Meta<typeof CellPopup>;
export default meta;
export const Preview: StoryObj = {
  render: (args) => <Example name="CellPopup" args={args} />,
};
