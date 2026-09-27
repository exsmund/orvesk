import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DeckStatsEditor } from "./DeckStatsEditor";
import { defaultDeckStats } from "./deck-progression";
import { defaultDeckArmor } from "./deck-armor";

const meta = {
  title: "Прототипы/Настройка характеристик",
  component: DeckStatsEditor,
  args: {
    value: { player: defaultDeckStats, wolf: defaultDeckStats },
    armor: defaultDeckArmor,
    onApply: fn(),
  },
  argTypes: {
    value: { control: "object" },
    armor: { control: "object" },
    onApply: { action: "apply" },
  },
  render: (args) => (
    <DeckStatsEditor key={JSON.stringify([args.value, args.armor])} {...args} />
  ),
} satisfies Meta<typeof DeckStatsEditor>;
export default meta;
export const Preview: StoryObj<typeof meta> = {};
