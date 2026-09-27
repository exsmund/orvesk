import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemInspection } from "@/features/equipment/ItemInspection/ItemInspection";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/ItemInspection",
  component: ItemInspection,
  args: { source: "Награда" },
  argTypes: {
    equipment: { control: "object" },
    player: { control: "object" },
    opponent: { control: "object" },
    own: { control: "boolean" },
    source: { control: "text" },
  },
  parameters: { componentName: "ItemInspection" },
} satisfies Meta<typeof ItemInspection>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ItemInspection" args={args} />,
};
