import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal } from "@/shared/ui/Modal/Modal";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Modal",
  component: Modal,
  args: { title: "Пример модального окна", size: "small" },
  argTypes: {
    title: { control: "text" },
    children: { control: "text" },
    close: { action: "close", control: false },
    size: { control: "select", options: ["large", "small", "medium"] },
    onBack: { action: "onBack", control: false },
    disabled: { control: "boolean" },
    closeLabel: { control: "text" },
    backLabel: { control: "text" },
    titleId: { control: "text" },
    showClose: { control: "boolean" },
    closeOnBackdrop: { control: "boolean" },
    portal: { control: "boolean" },
    variant: { control: "select", options: ["standard", "bare"] },
  },
  parameters: { componentName: "Modal" },
} satisfies Meta<typeof Modal>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Modal" args={args} />,
};
