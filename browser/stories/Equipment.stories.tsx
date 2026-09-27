import "./equipment.css";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ITEMS, itemAtLevel, WEAPON_WEIGHTS } from "@/game/equipment/catalog";
import type { Item, WeaponWeight } from "@/game/types";
import { ItemInspection } from "@/features/equipment/ItemInspection/ItemInspection";
import { fighter } from "./fixtures";
import { Text } from "@/shared/ui/Text";

function EquipmentPage({
  kind,
  title,
  weaponStat,
  weaponLevel,
  statValue,
  weightClass,
}: {
  kind: Item["kind"];
  title: string;
  weaponStat: "all" | "strength" | "agility" | "intelligence" | "hybrid";
  weaponLevel: number;
  statValue: number;
  weightClass: "all" | WeaponWeight;
}) {
  const items = ITEMS.filter(
    (equipment) =>
      equipment.kind === kind &&
      (kind !== "weapon" ||
        weightClass === "all" ||
        equipment.weightClass === weightClass) &&
      (kind !== "weapon" ||
        weaponStat === "all" ||
        (weaponStat === "hybrid"
          ? Object.keys(equipment.requirements).length > 1
          : Object.keys(equipment.requirements).length === 1 &&
            weaponStat in equipment.requirements)),
  ).map((equipment) => itemAtLevel(equipment, weaponLevel));
  const value = Math.max(1, Math.floor(statValue));
  const player = {
    ...fighter,
    stats: {
      ...fighter.stats,
      strength: value,
      agility: value,
      intelligence: value,
    },
  };
  return (
    <section className="sb-equipment">
      <Text as="h1" size="2xl" font="display">
        {title}
      </Text>
      <Text as="p">
        {items.length} предметов. Формулы и урон рассчитаны по характеристикам
        тестового героя.
      </Text>
      <div className="sb-equipment-grid">
        {items.map((equipment) => (
          <article className="sb-equipment-card" key={equipment.id}>
            <ItemInspection equipment={equipment} player={player} own />
          </article>
        ))}
      </div>
    </section>
  );
}
const meta = {
  title: "Экипировка",
  component: EquipmentPage,
  args: { weaponStat: "all", weaponLevel: 1, statValue: 1, weightClass: "all" },
  argTypes: {
    weightClass: {
      name: "Вес оружия",
      control: {
        type: "select",
        labels: {
          all: "Все",
          ...Object.fromEntries(
            Object.entries(WEAPON_WEIGHTS).map(([key, value]) => [
              key,
              value.name,
            ]),
          ),
        },
      },
      options: ["all", ...Object.keys(WEAPON_WEIGHTS)],
    },
    weaponStat: {
      name: "Оружие по характеристике",
      control: "select",
      options: ["all", "strength", "agility", "intelligence", "hybrid"],
    },
    weaponLevel: {
      name: "Уровень предмета",
      control: { type: "range", min: 1, max: 30, step: 1 },
    },
    statValue: {
      name: "Атакующие характеристики героя",
      control: { type: "range", min: 1, max: 30, step: 1 },
    },
  },
} satisfies Meta<typeof EquipmentPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Weapons: Story = {
  name: "Оружие",
  args: { kind: "weapon", title: "Оружие" },
};
export const Shields: Story = {
  name: "Щиты",
  args: { kind: "shield", title: "Щиты" },
};
export const Clothing: Story = {
  name: "Одежда",
  args: { kind: "armor", title: "Одежда" },
};
export const Jewelry: Story = {
  name: "Украшения",
  args: { kind: "jewelry", title: "Украшения" },
};
