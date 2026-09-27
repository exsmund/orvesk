import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { portrait } from "@/game/characters/portraits";
import { fighter } from "../../../../stories/fixtures";
const meta = {
  title: "src/shared/ui/CharacterPortrait/Варианты",
  component: CharacterPortrait,
  args: { src: portrait(fighter.portraitId).src, alt: fighter.name },
  parameters: {
    docs: {
      description: {
        component:
          "Крупный портрет используется в карточках героев и противников, создании персонажа и диалогах. Маленький круглый вариант используется в шапке; его размер совпадает с узлами карты (36–68 px).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 160 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CharacterPortrait>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Large: Story = { name: "Крупный", args: { size: "large" } };
export const Small: Story = { name: "Маленький", args: { size: "small" } };

export const DeadLarge: Story = {
  name: "Погибший · крупный",
  args: { size: "large", dead: true },
};
export const DeadSmall: Story = {
  name: "Погибший · маленький",
  args: { size: "small", dead: true },
};

export const DeadEnemyLarge: Story = {
  name: "Погибший противник · крупный",
  args: { size: "large", dead: true, side: "enemy" },
};
export const DeadEnemySmall: Story = {
  name: "Погибший противник · маленький",
  args: { size: "small", dead: true, side: "enemy" },
};
