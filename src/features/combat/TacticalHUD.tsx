import { ResourceBar } from "../../shared/ui/ResourceBar";
import { maxHp } from "../../game/combat/engine";
import { maxPoise, poise } from "../../game/combat/tactics";
import type { Fighter } from "../../game/types";
export function Resources({ fighter }: { fighter: Fighter }) {
  return (
    <div className="combat-resources">
      <ResourceBar
        kind="health"
        value={fighter.hp}
        max={maxHp(fighter)}
        compact
        label={`Здоровье: ${fighter.name}`}
      />
      <ResourceBar
        kind="poise"
        value={poise(fighter)}
        max={maxPoise(fighter)}
        compact
        label={`Стойка: ${fighter.name}`}
      />
    </div>
  );
}
