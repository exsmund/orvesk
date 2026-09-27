import { isEvade } from "@/game/skills/skills";
import { isStrike, isGuard } from "@/game/combat/reaction-rules";
import type { ClashCell, Maneuver } from "@/game/types";

export function cellInteraction(
  a?: Maneuver,
  b?: Maneuver,
): ClashCell["interaction"] {
  return (isEvade(a) && (isStrike(b) || isGuard(b))) ||
    (isEvade(b) && (isStrike(a) || isGuard(a)))
    ? "evaded"
    : isStrike(a) && isStrike(b)
      ? "clash"
      : (isStrike(a) && isGuard(b)) || (isGuard(a) && isStrike(b))
        ? "blocked"
        : isStrike(a) || isStrike(b)
          ? "attack"
          : isGuard(a) && isGuard(b)
            ? "guard"
            : isGuard(a) || isGuard(b)
              ? "pressure"
              : a || b
                ? "utility"
                : "empty";
}
