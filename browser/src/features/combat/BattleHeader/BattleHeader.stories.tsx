import type { Meta, StoryObj } from "@storybook/react-vite";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";
import { Example } from "../../../../stories/examples";
const meta = {
  title: "src/features/combat/BattleHeader",
  component: BattleHeader,
  args: { screen: "battle", mode: "free", mapNumber: 1 },
  argTypes: {
    mapNumber: { control: { type: "number", min: 1 } },
    enemy: { control: "object", if: { arg: "screen", eq: "battle" } },
    enemyPreview: { control: "object", if: { arg: "screen", eq: "battle" } },
    onEnemy: { action: "onEnemy", control: false },
    souls: { control: "number", if: { arg: "screen", eq: "map" } },
    player: { control: "object" },
    mode: { control: "select", options: ["free", "expendable"] },
    onPlayer: { action: "onPlayer", control: false },
    playerPreview: { control: "object" },
    screen: { control: "select", options: ["battle", "map"] },
  },
  parameters: { componentName: "BattleHeader" },
} satisfies Meta<typeof BattleHeader>;
export default meta;
export const Preview: StoryObj = {
  name: "Пример",
  render: (args) => <Example name="BattleHeader" args={args} />,
};
