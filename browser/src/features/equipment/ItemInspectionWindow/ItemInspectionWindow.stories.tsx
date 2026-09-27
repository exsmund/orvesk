import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemInspectionWindow } from "@/features/equipment/ItemInspectionWindow/ItemInspectionWindow";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/ItemInspectionWindow",
  component: ItemInspectionWindow,
  args: {},
  argTypes: {
    equipment: { control: "object" },
    player: { control: "object" },
    opponent: { control: "object" },
    own: { control: "boolean" },
    source: { control: "text" },
    close: { action: "close", control: false },
  },
  parameters: { componentName: "ItemInspectionWindow" },
} satisfies Meta<typeof ItemInspectionWindow>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ItemInspectionWindow" args={args} />,
};
