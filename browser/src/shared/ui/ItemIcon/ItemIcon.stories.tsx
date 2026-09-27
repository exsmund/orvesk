import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/ItemIcon",
  component: ItemIcon,
  args: { size: 120, framed: true },
  argTypes: {
    children: { control: "text" },
    size: { control: "object" },
    framed: { control: "boolean" },
  },
  parameters: { componentName: "ItemIcon" },
} satisfies Meta<typeof ItemIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ItemIcon" args={args} />,
};
