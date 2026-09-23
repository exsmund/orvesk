import { journeyMapPreset } from "../../game/journey/journey-map";
import type { Journey } from "../../game/types";
import "./combat-backdrop.css";

export function CombatBackdrop({
  journey,
}: {
  journey?: Pick<Journey, "mapPreset">;
}) {
  return (
    <div className="combat-backdrop" aria-hidden="true">
      <img src={journeyMapPreset(journey).battleBackground} alt="" />
      <div />
    </div>
  );
}
