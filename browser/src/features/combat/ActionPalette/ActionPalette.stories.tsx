import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionPalette } from "@/features/combat/ActionPalette/ActionPalette";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/ActionPalette",
  component: ActionPalette,
  args: { busy: false },
  argTypes: {
    rotations: { control: "object" },
    onFigurePointerDown: { action: "onFigurePointerDown", control: false },
    onFigurePointerMove: { action: "onFigurePointerMove", control: false },
    onFigurePointerUp: { action: "onFigurePointerUp", control: false },
    onFigurePointerCancel: { action: "onFigurePointerCancel", control: false },
    fighter: { control: "object" },
    tokens: { control: "object" },
    selected: { control: "text" },
    rotation: { control: "number" },
    mod: { control: "object" },
    placed: { control: "object" },
    busy: { control: "boolean" },
    onSelect: { action: "onSelect", control: false },
    onScale: { action: "onScale", control: false },
  },
  parameters: { componentName: "ActionPalette" },
} satisfies Meta<typeof ActionPalette>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ActionPalette" args={args} />,
};
