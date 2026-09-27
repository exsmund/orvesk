import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionSource } from "@/features/combat/ActionSource/ActionSource";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/ActionSource",
  component: ActionSource,
  args: {},
  argTypes: {
    size: {
      control: "select",
      options: [undefined, 26, 40, 64, "100%"],
      description: "Размер в пикселях или заполнение всей ячейки.",
    },
    m: { control: "object" },
  },
  parameters: { componentName: "ActionSource" },
  decorators: [
    (Story) => (
      <div style={{ width: 80, height: 80 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionSource>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="ActionSource" args={args} />,
};
