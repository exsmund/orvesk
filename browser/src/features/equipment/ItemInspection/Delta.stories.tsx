import type { Meta, StoryObj } from "@storybook/react-vite";
import { Delta } from "@/features/equipment/ItemInspection/Delta";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/equipment/ItemInspection/Delta",
  component: Delta,
  args: {},
  argTypes: { row: { control: "object" } },
  parameters: { componentName: "Delta" },
} satisfies Meta<typeof Delta>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="Delta" args={args} />,
};
