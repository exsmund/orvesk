import type { Meta, StoryObj } from "@storybook/react-vite";
import { Rules } from "@/features/rules/Rules/Rules";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/rules/Rules",
  component: Rules,
  args: {},
  argTypes: {},
  parameters: { componentName: "Rules" },
} satisfies Meta<typeof Rules>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Rules" args={args} />,
};
