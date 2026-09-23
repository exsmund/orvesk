import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleHeader } from "../src/features/combat/BattleHeader";
import { pub, noop } from "./fixtures";
const meta = {
  title: "Компоненты/Бой/BattleHeader",
  component: BattleHeader,
  parameters: { layout: "fullscreen" },
  args: { player: pub.player, mode: "limited", onPlayer: noop },
} satisfies Meta<typeof BattleHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Battle: Story = {
  name: "Бой",
  args: { screen: "battle", enemy: pub.enemy, onEnemy: noop },
};
export const Map: Story = { name: "Карта", args: { screen: "map", souls: 12 } };
