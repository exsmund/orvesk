import { Text } from "@/shared/ui/Text";
import type { Fighter } from "@/game/types";
import "@/features/characters/FighterDebuffs/FighterDebuffs.css";
export function FighterDebuffs({
  fighter,
}: {
  fighter: Fighter;
  onOpen?: () => void;
}) {
  return fighter.hp > 0 && fighter.exhausted ? (
    <Text as="p" color="danger">
      Истощение: восстановление +2 пропущено.
    </Text>
  ) : null;
}
