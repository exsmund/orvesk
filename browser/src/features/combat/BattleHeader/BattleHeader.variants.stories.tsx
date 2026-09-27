import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";
import { pub, noop } from "../../../../stories/fixtures";
const meta = {
  title: "src/features/combat/BattleHeader/Варианты",
  component: BattleHeader,
  parameters: { layout: "fullscreen" },
  args: { player: pub.player, mode: "free", onPlayer: noop },
} satisfies Meta<typeof BattleHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Battle: Story = {
  name: "Бой",
  args: { screen: "battle", enemy: pub.enemy, onEnemy: noop },
};
export const Map: Story = { name: "Карта", args: { screen: "map", souls: 12 } };
