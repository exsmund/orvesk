import "@/features/combat/BattleModeDialog/BattleModeDialog.css";
import { Text } from "@/shared/ui/Text";
import { BATTLE_MODES } from "@/game/combat/battle-modes";
import type { BattleMode } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { BattleModeArtwork } from "@/features/combat/BattleModeArtwork/BattleModeArtwork";

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
      className="battle-result-dialog battle-mode-dialog"
    >
      <div className="battle-result-scroll battle-mode-dialog__body">
        <BattleModeArtwork mode={mode} decorative />
        <Text as="p">{rules.description}</Text>
        <Text as="p">Правила одинаковы для вас и противника.</Text>
      </div>
      <ModalFooter>
        <GothicTextButton onClick={onContinue}>Начать схватку</GothicTextButton>
      </ModalFooter>
    </Modal>
  );
}
