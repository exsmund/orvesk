import type { Meta, StoryObj } from "@storybook/react-vite";
import { FigureCard } from "@/features/combat/FigureCard";
import { itemManeuvers } from "@/game/combat/reaction-rules";
import { item } from "@/game/equipment/catalog";
import { skill, skillManeuver } from "@/game/skills/skills";

const meta = {
  title: "src/features/combat/FigureCard",
  component: FigureCard,
  args: {
    figure: itemManeuvers(item("dagger"))[1],
    stats: { strength: 1, agility: 1, vitality: 1, intelligence: 1 },
  },
  argTypes: {
    figure: { control: "object" },
    stats: { control: "object" },
  },
} satisfies Meta<typeof FigureCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Preview: Story = { name: "Сильный удар" };
export const MixedDamage: Story = {
  name: "Смешанный урон",
  args: { figure: itemManeuvers(item("frost-dagger@2"))[1] },
};
export const Block: Story = {
  name: "Блок",
  args: { figure: itemManeuvers(item("buckler"))[0] },
};
export const Healing: Story = {
  name: "Лечение",
  args: { figure: skillManeuver(skill("bandage")!) },
};
export const Parry: Story = {
  name: "Парирование",
  args: { figure: skillManeuver(skill("parry")!) },
};
