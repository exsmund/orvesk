import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeckWolfPrototype } from "./wolf-prototypes/DeckWolfPrototype";
import { defaultDeckStats } from "./wolf-prototypes/deck-progression";
const meta = {
  title: "Прототипы/Колода и выносливость",
  component: DeckWolfPrototype,
  parameters: { layout: "fullscreen" },
  args: {
    seed: 42,
    alternating: false,
    playerStats: defaultDeckStats,
    wolfStats: defaultDeckStats,
    playerArmor: 0,
    wolfArmor: 0,
  },
  argTypes: {
    seed: { control: "number" },
    alternating: { control: "boolean" },
    playerStats: { control: "object" },
    wolfStats: { control: "object" },
    playerArmor: { control: { type: "number", min: 0, max: 99, step: 1 } },
    wolfArmor: { control: { type: "number", min: 0, max: 99, step: 1 } },
  },
  render: (args) => <DeckWolfPrototype key={JSON.stringify(args)} {...args} />,
} satisfies Meta<typeof DeckWolfPrototype>;
export default meta;
export const Preview: StoryObj<typeof meta> = { name: "Бой с волком" };

export const Alternating: StoryObj<typeof meta> = {
  name: "Чередование первого хода",
  args: { alternating: true },
};
