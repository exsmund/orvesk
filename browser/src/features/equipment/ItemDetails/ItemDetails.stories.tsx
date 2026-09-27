import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemDetails } from "@/features/equipment/ItemDetails/ItemDetails";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/ItemDetails",
  component: ItemDetails,
  args: {},
  argTypes: {
    equipment: { control: "object" },
    fighter: { control: "object" },
  },
  parameters: { componentName: "ItemDetails" },
} satisfies Meta<typeof ItemDetails>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ItemDetails" args={args} />,
};
