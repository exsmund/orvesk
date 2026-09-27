import type { Meta, StoryObj } from "@storybook/react-vite";
import { NodeDialog } from "@/features/journey/JourneyMap/NodeDialog";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/journey/JourneyMap/NodeDialog",
  component: NodeDialog,
  args: { status: "Можно идти", canVisit: true, busy: false },
  argTypes: {
    node: { control: "object" },
    enemyLevel: { control: "number" },
    enemyPortrait: { control: "text" },
    enemyName: { control: "text" },
    enemyDescription: { control: "text" },
    enemyType: { control: "text" },
    actionLabel: { control: "text" },
    status: { control: "text" },
    canVisit: { control: "boolean" },
    busy: { control: "boolean" },
    onClose: { action: "onClose", control: false },
    onConfirm: { action: "onConfirm", control: false },
  },
  parameters: { componentName: "NodeDialog" },
} satisfies Meta<typeof NodeDialog>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="NodeDialog" args={args} />,
};
