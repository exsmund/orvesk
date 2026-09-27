import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";
import { item } from "@/game/equipment/catalog";
import { SOUL_ICON } from "@/features/characters/SoulBalance/model";

const meta = {
  title: "Проверки/Иконки",
  component: ItemIcon,
} satisfies Meta<typeof ItemIcon>;
export default meta;
export const AllVariants: StoryObj = {
  name: "Размеры, рамки и содержимое",
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {[false, true].map((framed) => (
        <section key={String(framed)}>
          <h2>{framed ? "С рамкой" : "Без рамки"}</h2>
          {[40, 80, 160].map((size) => (
            <div
              key={size}
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <EquipmentIcon
                equipment={item("unlock-ring")}
                size={size}
                framed={framed}
              />
              <EquipmentIcon
                equipment={item("fold-amulet")}
                size={size}
                framed={framed}
              />
              <SkillIcon id="dodge" size={size} framed={framed} />
              <ItemIcon size={size} framed={framed}>
                <img src={SOUL_ICON} alt="Осколки" />
              </ItemIcon>
              <ItemIcon size={size} framed={framed} />
              <ItemIcon size={size} framed={framed} />
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};
