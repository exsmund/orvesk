import type { Meta, StoryObj } from "@storybook/react-vite";
import { Popup } from "@/shared/ui/Popup";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Popup",
  component: Popup,
  argTypes: {
    anchor: { control: false },
    onClose: { action: "close" },
    children: { control: "text" },
  },
  parameters: { componentName: "Popup" },
} satisfies Meta<typeof Popup>;
export default meta;
export const Preview: StoryObj = {
  render: (args) => <Example name="Popup" args={args} />,
};
