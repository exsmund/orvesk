import type { ResourceChange } from "./resource-preview";
import { ResourceBar } from "../../shared/ui/ResourceBar";
import { maxHp } from "../../game/combat/engine";
import { maxPoise, poise } from "../../game/combat/tactics";
import type { Fighter } from "../../game/types";
export function Resources({
  fighter,
  preview,
}: {
  fighter: Fighter;
  preview?: ResourceChange;
}) {
  return (
    <div className="combat-resources">
      <ResourceBar
        kind="health"
        change={preview?.health}
        value={fighter.hp}
        max={maxHp(fighter)}
        compact
        label={`Здоровье: ${fighter.name}`}
      />
      <ResourceBar
        kind="poise"
        change={preview?.poise}
        value={poise(fighter)}
        max={maxPoise(fighter)}
        compact
        label={`Стойка: ${fighter.name}`}
      />
    </div>
  );
}
