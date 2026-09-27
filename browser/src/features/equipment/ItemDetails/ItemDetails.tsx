import { Text } from "@/shared/ui/Text";
import "@/features/equipment/ItemDetails/ItemDetails.css";
import { DAMAGE, STATS } from "@/game/equipment/catalog";
import { type Fighter, type Item } from "@/game/types";
export function ItemDetails({
  equipment,
  fighter,
}: {
  equipment: Item;
  fighter: Fighter;
}) {
  return (
    <>
      <Text as="p" className="item-description">
        {equipment.description}
      </Text>
      <div className="item-properties">
        <Text>Уровень {equipment.level ?? 1}</Text>
        {equipment.hands && (
          <Text as="span">
            {equipment.hands === 2 ? "Две руки" : "Одна рука"}
          </Text>
        )}
        {equipment.kind !== "shield" &&
          equipment.defense &&
          Object.entries(equipment.defense).map(([type, value]) => (
            <Text as="span" key={type}>
              Броня · {DAMAGE[type as keyof typeof DAMAGE]}: {value} (урон × 10 / {10 + value})
            </Text>
          ))}
      </div>
      <div className="requirements">
        <Text>Требования:</Text>
        <Text> </Text>
        {Object.entries(equipment.requirements).map(([key, val]) => (
          <Text
            as="span"
            className={
              fighter.stats[key as keyof typeof STATS] < val ? "unmet" : ""
            }
            key={key}
          >
            <Text as="span" className="stat-name">
              {STATS[key as keyof typeof STATS]}
            </Text>{" "}
            {val}{" "}
            <Text as="small">
              (у вас {fighter.stats[key as keyof typeof STATS]})
            </Text>
          </Text>
        ))}
        <Text>{!Object.keys(equipment.requirements).length && "нет"}</Text>
      </div>
    </>
  );
}
