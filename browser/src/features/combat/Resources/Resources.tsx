import "@/features/combat/Resources/Resources.css";
import { maxHp } from "@/game/combat/engine";
import { maxStamina, stamina } from "@/game/combat/tactics";
import type { Fighter } from "@/game/types";
import { ResourceBar } from "@/shared/ui/ResourceBar/ResourceBar";
import type { ResourceChange } from "@/features/combat/resource-preview";
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
        kind="stamina"
        change={preview?.stamina}
        value={preview?.available ?? stamina(fighter)}
        max={maxStamina()}
        compact
        label={`Выносливость: ${fighter.name}`}
      />
    </div>
  );
}
