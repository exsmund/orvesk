import type { Meta, StoryObj } from "@storybook/react-vite";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/GothicIcon",
  component: GothicIcon,
  args: {},
  argTypes: {
    icon: {
      control: "select",
      options: ["menu", "left", "right", "close", "minus", "plus", "grave"],
    },
  },
  parameters: { componentName: "GothicIcon" },
} satisfies Meta<typeof GothicIcon>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="GothicIcon" args={args} />,
};
