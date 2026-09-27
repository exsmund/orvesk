import { Text } from "@/shared/ui/Text";
import "@/features/journey/BattleModeInfo/BattleModeInfo.css";

import { BATTLE_MODES, battleMode } from "@/game/combat/battle-modes";
import type { PublicGame } from "@/game/types";
import { BattleModeArtwork } from "@/features/combat/BattleModeArtwork/BattleModeArtwork";

export function BattleModeInfo({
  game,
  compact = false,
}: {
  game: PublicGame;
  compact?: boolean;
}) {
  const mode = battleMode(game.journey),
    info = BATTLE_MODES[mode];
  return (
    <details className="battle-mode" open={!compact}>
      <Text as="summary">Режим путешествия: {info.name}</Text>
      <BattleModeArtwork mode={mode} decorative />
      <Text as="p">{info.description} Правила одинаковы для обеих сторон.</Text>
      {mode !== "free" && (
        <Text as="p">
          Скалы и собственные фигуры перекрывать нельзя. Штраф равновесия и
          бонус клеток элиты не действуют.
        </Text>
      )}
      {mode === "expendable" && (
        <Text as="p">
          Можно пропустить ход, сохранив фигуры. Подъём доступен после каждого
          падения. Если у обоих закончились атаки и подбор не может дать новые —
          ничья и повтор боя.
        </Text>
      )}
    </details>
  );
}
