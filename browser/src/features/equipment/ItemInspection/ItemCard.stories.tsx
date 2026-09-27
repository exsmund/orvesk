import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemCard } from "@/features/equipment/ItemInspection/ItemCard";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/ItemInspection/ItemCard",
  component: ItemCard,
  args: { label: "Предмет", candidate: false, compare: false },
  argTypes: {
    equipment: { control: "object" },
    actor: { control: "object" },
    player: { control: "object" },
    label: { control: "text" },
    rows: { control: "object" },
    candidate: { control: "boolean" },
    compare: { control: "boolean" },
  },
  parameters: { componentName: "ItemCard" },
} satisfies Meta<typeof ItemCard>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ItemCard" args={args} />,
};
