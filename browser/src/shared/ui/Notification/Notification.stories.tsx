import type { Meta, StoryObj } from "@storybook/react-vite";
import { Notification } from "@/shared/ui/Notification";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Notification",
  component: Notification,
  args: {
    message: "Сначала откройте предыдущие этапы пути.",
    duration: 3000,
    onClose: () => {},
  },
  argTypes: {
    message: { control: "text" },
    duration: { control: "number" },
    onClose: { action: "close" },
  },
  parameters: { componentName: "Notification" },
} satisfies Meta<typeof Notification>;
export default meta;
export const Preview: StoryObj<typeof meta> = {
  render: (args) => <Example name="Notification" args={args} />,
};
