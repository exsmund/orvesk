import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mark } from "@/shared/ui/Mark/Mark";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/shared/ui/Mark",
  component: Mark,
  args: {},
  argTypes: {},
  parameters: { componentName: "Mark" },
} satisfies Meta<typeof Mark>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Mark" args={args} />,
};
