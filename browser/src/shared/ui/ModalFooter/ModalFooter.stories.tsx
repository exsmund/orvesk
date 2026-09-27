import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/ModalFooter",
  component: ModalFooter,
  args: { hint: "Подсказка над кнопкой" },
  argTypes: { hint: { control: "object" }, children: { control: "text" } },
  parameters: { componentName: "ModalFooter" },
} satisfies Meta<typeof ModalFooter>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ModalFooter" args={args} />,
};
