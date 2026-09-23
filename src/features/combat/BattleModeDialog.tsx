import { BattleModeArtwork } from "./BattleModeArtwork";
import type { BattleMode } from "../../game/types";
import { BATTLE_MODES } from "../../game/combat/battle-modes";
import { Modal } from "../../shared/ui/Modal";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import "./battle-result-dialog.css";
export function BattleModeDialog({
  mode,
  onContinue,
}: {
  mode: BattleMode;
  onContinue: () => void;
}) {
  const rules = BATTLE_MODES[mode];
  return (
    <Modal
      title={rules.name}
      close={onContinue}
      size="small"
      className="battle-result-dialog"
    >
      <div className="battle-result-scroll">
        <BattleModeArtwork mode={mode} decorative />
        <p>{rules.description}</p>
        <p>Правила одинаковы для вас и противника.</p>
      </div>
      <ModalFooter>
        <GothicTextButton onClick={onContinue}>Начать схватку</GothicTextButton>
      </ModalFooter>
    </Modal>
  );
}
