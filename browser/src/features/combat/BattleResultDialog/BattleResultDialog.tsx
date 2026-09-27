import { Text } from "@/shared/ui/Text";
import "@/features/combat/BattleResultDialog/BattleResultDialog.css";
import type { PublicGame } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { ClashOutcome } from "@/features/combat/ClashOutcome/ClashOutcome";

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
        {game.journey?.battleMode === "expendable" &&
          game.phase !== "defeat" && (
            <Text as="p">
              Оставшееся здоровье: вы — {game.player.hp}, противник —{" "}
              {game.enemy.hp}.
            </Text>
          )}
        {game.phase === "defeat" && (
          <Text as="p">
            Осколки остались у противника. Победите его, чтобы вернуть их. Новое
            поражение уничтожит предыдущий запас. Кнопка «Начать с начала»
            возвращает в начало карты с полным здоровьем и выносливостью;
            характеристики, навыки и снаряжение сохранены.
          </Text>
        )}
        {game.phase === "draw" && (
          <Text as="p">
            Поединок завершился ничьей. Можно снова встретиться с противником.
          </Text>
        )}
        {turn?.clash ? (
          <ClashOutcome
            turn={turn}
            onDone={onClose}
            ending="К карте"
            showContinue={false}
          />
        ) : (
          turn?.events.map((event, index) => (
            <Text as="p" key={index}>
              {event}
            </Text>
          ))
        )}
      </div>
      <ModalFooter>
        <GothicTextButton onClick={onClose}>К карте</GothicTextButton>
      </ModalFooter>
    </Modal>
  );
}
