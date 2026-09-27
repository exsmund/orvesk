import type { Meta, StoryObj } from "@storybook/react-vite";
import { EquipmentDoll } from "@/features/equipment/EquipmentDoll/EquipmentDoll";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/EquipmentDoll",
  component: EquipmentDoll,
  args: {},
  argTypes: {
    fighter: { control: "object" },
    onInspect: { action: "onInspect", control: false },
  },
  parameters: { componentName: "EquipmentDoll" },
} satisfies Meta<typeof EquipmentDoll>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="EquipmentDoll" args={args} />,
};
