import { allFigures } from "@/game/combat/deck";
import { creature } from "@/game/creatures/catalog";
import { SLOTS, item } from "@/game/equipment/catalog";
import { maneuverDamage } from "@/game/combat/reaction-rules";
import type { Fighter, Item } from "@/game/types";
import { Text } from "@/shared/ui/Text";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon";
import { ActionFigure } from "@/features/combat/ActionFigure";
import "@/features/creatures/CreatureDetails/CreatureDetails.css";
export function CreatureDetails({
  fighter,
  onInspect,
}: {
  fighter: Fighter;
  onInspect: (item: Item) => void;
}) {
  const c = creature(fighter.creatureId);
  if (!c) return null;
  return (
    <section className="creature-details" aria-label={`Свойства: ${c.name}`}>
      <Text as="p">{c.description}</Text>
      <Text as="p" color="muted">
        {c.equipment.slots.length
          ? `Допустимая экипировка: ${c.equipment.slots.map((s) => SLOTS[s]).join(", ")}.`
          : "Не использует экипировку."}
      </Text>
      <div className="creature-details__gear">
        {c.equipment.slots.map((slot) => {
          const id = fighter.gear[slot];
          return id ? (
            <button
              key={slot}
              type="button"
              onClick={() => onInspect(item(id))}
              aria-label={item(id).name}
            >
              <EquipmentIcon equipment={item(id)} size={56} framed />
            </button>
          ) : null;
        })}
      </div>
      <Text as="h3">Действия</Text>
      {allFigures(fighter).map((m) => (
        <div className="creature-details__figure" key={m.id}>
          <ActionFigure m={m} damage={maneuverDamage(fighter, m)} />
          <div>
            <Text as="h4">{m.name}</Text>
            <Text as="p" color="muted">
              {m.description}
            </Text>
          </div>
        </div>
      ))}
    </section>
  );
}
