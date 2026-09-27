import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModalHeader } from "@/shared/ui/Modal/ModalHeader";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Modal/ModalHeader",
  component: ModalHeader,
  args: { title: "Заголовок" },
  argTypes: {
    title: { control: "text" },
    titleId: { control: "text" },
    onClose: { action: "onClose", control: false },
    onBack: { action: "onBack", control: false },
    disabled: { control: "boolean" },
    closeLabel: { control: "text" },
    backLabel: { control: "text" },
  },
  parameters: { componentName: "ModalHeader" },
} satisfies Meta<typeof ModalHeader>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ModalHeader" args={args} />,
};
