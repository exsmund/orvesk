import type { Meta, StoryObj } from "@storybook/react-vite";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/EquipmentIcon",
  component: EquipmentIcon,
  args: { framed: true, size: 120 },
  argTypes: {
    size: { control: "object" },
    framed: { control: "boolean" },
    equipment: { control: "object" },
  },
  parameters: { componentName: "EquipmentIcon" },
} satisfies Meta<typeof EquipmentIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="EquipmentIcon" args={args} />,
};
