import type { Meta, StoryObj } from "@storybook/react-vite";
import { WolfPrototype } from "./wolf-prototypes/WolfPrototype";
const meta = {
  title: "Прототипы/Бой с волком",
  component: WolfPrototype,
  parameters: { layout: "fullscreen" },
  args: { seed: 42 },
  argTypes: { seed: { control: "number" }, mode: { control: false } },
  render: (args) => (
    <WolfPrototype key={`${args.mode}:${args.seed}`} {...args} />
  ),
} satisfies Meta<typeof WolfPrototype>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Planning: Story = {
  name: "Планирование на несколько ходов",
  args: { mode: "planning" },
};
export const Improvisation: Story = {
  name: "Меняющийся набор фигур",
  args: { mode: "improvisation" },
};
