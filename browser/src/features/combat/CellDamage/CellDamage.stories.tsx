import type { Meta, StoryObj } from "@storybook/react-vite";
import { CellDamage } from "@/features/combat/CellDamage";

const meta = {
  title: "src/features/combat/CellDamage",
  component: CellDamage,
  args: {
    damage: {
      playerDamage: 3,
      playerStaminaDamage: 1,
      enemyDamage: 0,
      enemyStaminaDamage: 0,
    },
  },
  argTypes: {
    damage: {
      control: "object",
      description:
        "Потери здоровья и выносливости в клетке: герой слева, противник справа. Цена фигур и блоков сюда не входит.",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <Story />
      </div>
    ),
  ],
  parameters: { componentName: "CellDamage" },
} satisfies Meta<typeof CellDamage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Preview: Story = {};
export const Clash: Story = {
  args: {
    damage: {
      playerDamage: 1.5,
      playerStaminaDamage: 0.5,
      enemyDamage: 2,
      enemyStaminaDamage: 1,
    },
  },
};
export const Blocked: Story = {
  args: {
    damage: {
      playerDamage: 0,
      playerStaminaDamage: 0,
      enemyDamage: 0,
      enemyStaminaDamage: 0,
    },
  },
};
