import type { Meta, StoryObj } from "@storybook/react-vite";
import { LayerIcon } from "@/features/combat/ReactionBoard/LayerIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/ReactionBoard/LayerIcon",
  component: LayerIcon,
  args: { side: "player" },
  argTypes: {
    m: { control: "object" },
    side: { control: "select", options: ["enemy", "player"] },
  },
  parameters: { componentName: "LayerIcon" },
} satisfies Meta<typeof LayerIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="LayerIcon" args={args} />,
};
