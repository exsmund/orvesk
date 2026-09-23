import type { Meta, StoryObj } from "@storybook/react-vite";
import { ITEMS } from "../src/game/equipment/catalog";
import type { Item } from "../src/game/types";
import { ItemArtwork } from "../src/features/equipment/EquipmentDoll";
import { ItemInspection } from "../src/features/equipment/ItemInspection";
import { fighter } from "./fixtures";
import "./equipment.css";

function EquipmentPage({ kind, title }: { kind: Item["kind"]; title: string }) {
  const items = ITEMS.filter((equipment) => equipment.kind === kind);
  return (
    <section className="sb-equipment">
      <h1>{title}</h1>
      <p>
        {items.length} предметов. Формулы и урон рассчитаны по характеристикам
        тестового героя.
      </p>
      <div className="sb-equipment-grid">
        {items.map((equipment) => (
          <article className="sb-equipment-card" key={equipment.id}>
            <div className="sb-equipment-summary">
              <ItemArtwork equipment={equipment} />
              <h2>{equipment.name}</h2>
              <p>{equipment.description}</p>
            </div>
            <div className="sb-equipment-details">
              <ItemInspection equipment={equipment} player={fighter} own />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
const meta = { title: "Экипировка", component: EquipmentPage } satisfies Meta<
  typeof EquipmentPage
>;
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
