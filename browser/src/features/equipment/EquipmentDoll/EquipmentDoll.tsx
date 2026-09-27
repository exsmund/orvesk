import { Text } from "@/shared/ui/Text";
import "@/features/equipment/EquipmentDoll/EquipmentDoll.css";
import { SLOTS } from "@/game/equipment/catalog";
import { equipmentSlot } from "@/game/equipment/item-art";
import type { Fighter, Item } from "@/game/types";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";

import { labels, slots } from "@/features/equipment/EquipmentDoll/model";
export function EquipmentDoll({
  fighter,
  onInspect,
}: {
  fighter: Fighter;
  onInspect: (equipment: Item) => void;
}) {
  return (
    <section
      className="equipment-doll"
      aria-label={`Экипировка: ${fighter.name}`}
    >
      <div className="doll-stage">
        <img
          className="doll-silhouette"
          src="/ui/equipment-silhouette-neutral.png"
          alt="Силуэт человека с ячейками экипировки"
          width="1145"
          height="1374"
        />
        {slots.map((slot) => {
          const state = equipmentSlot(fighter, slot);
          const caption = state.blocked
            ? `Занята: ${state.occupiedBy!.name}, две руки`
            : state.unarmed
              ? "Кулак, без оружия"
              : (state.equipment?.name ?? "Пусто");
          return (
            <button
              key={slot}
              type="button"
              className={`doll-slot slot-${slot} ${state.equipment ? "occupied" : "empty"} ${state.blocked ? "blocked" : ""}`}
              onClick={() => {
                const equipment = state.equipment ?? state.occupiedBy;
                if (equipment) onInspect(equipment);
              }}
              aria-label={`${SLOTS[slot]}: ${caption}`}
              aria-haspopup={
                state.equipment || state.occupiedBy ? "dialog" : undefined
              }
              title={`${SLOTS[slot]}: ${caption}`}
            >
              <Text as="span" className="doll-slot-label">
                {labels[slot]}
              </Text>
              {state.equipment ? (
                <EquipmentIcon equipment={state.equipment} size="100%" framed />
              ) : (
                <ItemIcon size="100%" framed />
              )}
              {state.equipment?.hands === 2 && (
                <Text as="span" className="hands-badge">
                  2Р
                </Text>
              )}
              {state.blocked && (
                <Text as="span" className="blocked-label">
                  ЗАНЯТА
                </Text>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
