import type { Meta, StoryObj } from "@storybook/react-vite";
import { CharacterPortrait } from "../src/shared/ui/CharacterPortrait";
import { portrait } from "../src/game/characters/portraits";
import { fighter } from "./fixtures";
const meta = {
  title: "Компоненты/Общие/CharacterPortrait/Размеры",
  component: CharacterPortrait,
  args: { src: portrait(fighter.portraitId).src, alt: fighter.name },
  parameters: {
    docs: {
      description: {
        component:
          "Крупный портрет используется в карточках героев и противников, создании персонажа и диалогах. Маленький круглый вариант пока демонстрируется только в Storybook; его размер совпадает с узлами карты (36–68 px).",
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
