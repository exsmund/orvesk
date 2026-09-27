import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreatureDetails } from "@/features/creatures/CreatureDetails";
import { createGame } from "@/game/combat/engine";
const fighter = {
  ...createGame("Волк", () => 0.5).player,
  gear: {
    weapon: null,
    shield: null,
    body: null,
    feet: null,
    ring: null,
    amulet: null,
  },
  creatureId: "wolf",
  name: "Дикий волк",
};
const meta = {
  title: "src/features/creatures/CreatureDetails",
  component: CreatureDetails,
  args: { fighter, onInspect: () => {} },
  argTypes: {
    fighter: { control: "object" },
    onInspect: { action: "inspect" },
  },
} satisfies Meta<typeof CreatureDetails>;
export default meta;
export const Preview: StoryObj<typeof meta> = {};
