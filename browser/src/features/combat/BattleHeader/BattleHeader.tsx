import { Text } from "@/shared/ui/Text";
import "@/features/combat/BattleHeader/BattleHeader.css";
import { useState } from "react";
import { portrait } from "@/game/characters/portraits";
import { BATTLE_MODES } from "@/game/combat/battle-modes";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { Modal } from "@/shared/ui/Modal/Modal";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import { BattleModeArtwork } from "@/features/combat/BattleModeArtwork/BattleModeArtwork";
import { Resources } from "@/features/combat/Resources/Resources";

import { BattleHeaderProps } from "@/features/combat/BattleHeader/model";
/** Shared map/battle header. Equal side columns keep the mode at the exact center. */
export function BattleHeader(props: BattleHeaderProps) {
  const [showMode, setShowMode] = useState(false);
  const rules = BATTLE_MODES[props.mode];
  return (
    <>
      <header
        className="battle-header"
        aria-label={
          props.screen === "map" ? "Состояние путешествия" : "Состояние боя"
        }
      >
        <div className="battle-header__content">
          <div className="battle-header__fighter">
            <CharacterPortrait
              size="small"
              src={portrait(props.player.portraitId).src}
              dead={props.screen === "battle" && props.player.hp <= 0}
              onClick={props.onPlayer}
              label={`Ваш персонаж: ${props.player.name}`}
              title={props.player.name}
            />
            <Resources fighter={props.player} preview={props.playerPreview} />
          </div>
          <div className="battle-header__mode-info">
            <button
              type="button"
              className="battle-header__mode"
              onClick={() => setShowMode(true)}
              aria-label={`Режим: ${rules.name}`}
              aria-haspopup="dialog"
              title={rules.name}
            >
              <BattleModeArtwork mode={props.mode} size="icon" decorative />
            </button>
            <Text as="span" size="xs" color="muted" align="center">
              Карта {props.mapNumber ?? 1}
            </Text>
          </div>
          {props.screen === "battle" ? (
            <div className="battle-header__fighter battle-header__enemy">
              <Resources fighter={props.enemy} preview={props.enemyPreview} />
              <CharacterPortrait
                size="small"
                src={portrait(props.enemy.portraitId).src}
                dead={props.enemy.hp <= 0}
                side="enemy"
                onClick={props.onEnemy}
                label={`Противник: ${props.enemy.name}`}
                title={props.enemy.name}
              />
            </div>
          ) : (
            <button
              type="button"
              className="battle-header__souls"
              onClick={props.onPlayer}
              aria-label={`Осколки: ${props.souls}. Открыть персонажа`}
            >
              <SoulBalance amount={props.souls} />
            </button>
          )}
        </div>
      </header>
      {showMode && (
        <Modal
          title={rules.name}
          close={() => setShowMode(false)}
          size="small"
          portal
        >
          <BattleModeArtwork mode={props.mode} decorative />
          <Text as="p">{rules.description}</Text>
          <Text as="p">Правила одинаковы для вас и противника.</Text>
        </Modal>
      )}
    </>
  );
}
