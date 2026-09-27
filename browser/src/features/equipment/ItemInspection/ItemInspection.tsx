import "@/features/equipment/ItemInspection/ItemInspection.css";

import { compareItem } from "@/game/equipment/item-comparison";
import type { Fighter, Item } from "@/game/types";

import { ItemCard } from "@/features/equipment/ItemInspection/ItemCard";
export function ItemInspection({
  equipment,
  player,
  opponent,
  own = false,
  source = "Предмет",
}: {
  equipment: Item;
  player: Fighter;
  opponent?: Fighter;
  own?: boolean;
  source?: string;
}) {
  const actor = own ? player : (opponent ?? player),
    comparison = compareItem(equipment, player);
  const rows = comparison.rows.filter((row) => !own || row.candidate > 0);
  return (
    <section
      className="item-inspection"
      aria-label={`Просмотр: ${equipment.name}`}
    >
      <div className={`inspection-columns ${own ? "single-card" : ""}`}>
        {!own && (
          <ItemCard
            equipment={comparison.current}
            actor={player}
            player={player}
            label="Сейчас на вас"
            rows={rows}
            candidate={false}
            compare={false}
          />
        )}
        <ItemCard
          equipment={equipment}
          actor={actor}
          player={player}
          label={own ? "Ваш предмет" : source}
          rows={rows}
          candidate
          compare={!own}
        />
      </div>
    </section>
  );
}
