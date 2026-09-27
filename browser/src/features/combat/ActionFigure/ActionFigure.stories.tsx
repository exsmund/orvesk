import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionFigure } from "@/features/combat/ActionFigure/ActionFigure";
import { item } from "@/game/equipment/catalog";
import { itemManeuvers } from "@/game/combat/reaction-rules";

const meta = {
  title: "src/features/combat/ActionFigure",
  component: ActionFigure,
  args: {
    m: itemManeuvers(item("axe"))[1],
    damage: 9,
    rotation: 0,
    compressed: false,
  },
  argTypes: {
    m: {
      control: "object",
      description:
        "Фигура: цена размещения, стоимость блока за клетку и урон выносливости берутся из её конфига. Переменная цена показывается диапазоном.",
    },
    rotation: { control: { type: "range", min: 0, max: 3, step: 1 } },
    compressed: { control: "boolean" },
    damage: {
      control: { type: "number", min: 0 },
      description:
        "Суммарный урон здоровью до блока и брони. Распределяется по клеткам; урон выносливости — второе число в клетке.",
    },
  },
  parameters: { componentName: "ActionFigure" },
} satisfies Meta<typeof ActionFigure>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Preview: Story = { name: "Урон здоровью и выносливости" };
export const Fist: Story = {
  name: "Удар кулаком",
  args: { m: itemManeuvers(item("fist"))[0], damage: 3 },
};
export const Block: Story = {
  name: "Блок с ценой 0–2",
  args: { m: itemManeuvers(item("buckler"))[0], damage: 0 },
};
export const CompressedBlock: Story = {
  name: "Сжатый блок с ценой 0–1",
  args: { m: itemManeuvers(item("buckler"))[0], damage: 0, compressed: true },
};
export const FixedCostBlock: Story = {
  name: "Блок с фиксированной ценой",
  args: {
    m: { ...itemManeuvers(item("buckler"))[0], staminaCost: 2, blockCost: 0 },
    damage: 0,
  },
};
export const BlockWithPlacementCost: Story = {
  name: "Блок с ценой размещения и ценой за клетку",
  args: {
    m: { ...itemManeuvers(item("buckler"))[0], staminaCost: 1 },
    damage: 0,
  },
};
export const Compressed: Story = {
  name: "Сжатая фигура",
  args: { compressed: true },
};
