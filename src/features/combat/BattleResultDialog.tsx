import type { PublicGame } from "../../game/types";
import { Modal } from "../../shared/ui/Modal";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { ClashOutcome } from "./ReactionBoard";
import "./battle-result-dialog.css";

export function BattleResultDialog({
  game,
  onClose,
}: {
  game: PublicGame;
  onClose: () => void;
}) {
  const turn = game.log[0];
  const title =
    game.phase === "victory"
      ? "Победа"
      : game.phase === "defeat"
        ? "Поражение"
        : "Ничья";
  return (
    <Modal
      title={title}
      close={onClose}
      size="large"
      className="battle-result-dialog"
    >
      <div className="battle-result-scroll">
        {game.journey?.battleMode === "expendable" && (
          <p>
            Оставшееся здоровье: вы — {game.player.hp}, противник —{" "}
            {game.enemy.hp}.
          </p>
        )}
        {game.phase === "defeat" && (
          <p>
            Все непотраченные души потеряны. Характеристики, навыки и снаряжение
            сохранены.
          </p>
        )}
        {game.phase === "draw" && (
          <p>
            Поединок завершился ничьей. Можно снова встретиться с противником.
          </p>
        )}
        {turn?.clash ? (
          <ClashOutcome
            turn={turn}
            onDone={onClose}
            ending="К карте"
            showContinue={false}
          />
        ) : (
          turn?.events.map((event, index) => <p key={index}>{event}</p>)
        )}
      </div>
      <ModalFooter>
        <GothicTextButton onClick={onClose}>К карте</GothicTextButton>
      </ModalFooter>
    </Modal>
  );
}
