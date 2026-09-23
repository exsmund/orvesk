import { useState } from "react";
import type { BattleMode, Fighter } from "../../game/types";
import { BATTLE_MODES } from "../../game/combat/battle-modes";
import { portrait } from "../../game/characters/portraits";
import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import { Modal } from "../../shared/ui/Modal";
import { SoulBalance } from "../characters/SoulBalance";
import { BattleModeArtwork } from "./BattleModeArtwork";
import { Resources } from "./TacticalHUD";
import type { ResourceChange } from "./resource-preview";
import "./battle-header.css";

type BattleHeaderProps = {
  player: Fighter;
  mode: BattleMode;
  onPlayer: () => void;
  playerPreview?: ResourceChange;
} & (
  | {
      screen: "battle";
      enemy: Fighter;
      enemyPreview?: ResourceChange;
      onEnemy: () => void;
    }
  | { screen: "map"; souls: number }
);

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
              onClick={props.onPlayer}
              label={`Ваш персонаж: ${props.player.name}`}
              title={props.player.name}
            />
            <Resources fighter={props.player} preview={props.playerPreview} />
          </div>
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
          {props.screen === "battle" ? (
            <div className="battle-header__fighter battle-header__enemy">
              <Resources fighter={props.enemy} preview={props.enemyPreview} />
              <CharacterPortrait
                size="small"
                src={portrait(props.enemy.portraitId).src}
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
              aria-label={`Души: ${props.souls}. Открыть персонажа`}
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
          <p>{rules.description}</p>
          <p>Правила одинаковы для вас и противника.</p>
        </Modal>
      )}
    </>
  );
}
