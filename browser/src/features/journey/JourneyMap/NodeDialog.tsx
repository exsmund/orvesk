import { Text } from "@/shared/ui/Text";
import "@/features/journey/JourneyMap/NodeDialog.css";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";

import type { JourneyNode } from "@/game/journey/journey-map";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";

import { nodeImage } from "@/features/journey/JourneyMap/model";
export function NodeDialog({
  node,
  enemyLevel,
  enemyPortrait,
  enemyName,
  enemyType,
  enemyDescription,
  actionLabel,
  status,
  canVisit,
  busy,
  onClose,
  onConfirm,
}: {
  node: JourneyNode;
  enemyLevel?: number;
  enemyPortrait?: string;
  enemyName?: string;
  enemyType?: string;
  enemyDescription?: string;
  actionLabel?: string;
  status: string;
  canVisit: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const description =
    node.kind === "camp"
      ? "Отдых у костра полностью восстановит здоровье и выносливость. После отдыха можно продолжить путь к следующему противнику."
      : node.kind === "forge"
        ? "Здесь можно заменить один предмет предложенным: прежняя вещь будет потеряна. Замену можно пропустить."
        : null;
  return (
    <Modal
      title={node.name}
      titleId="journey-node-title"
      close={onClose}
      className="journey-node-dialog"
      size="small"
      portal
    >
      <div className="journey-node-details">
        <>
          {node.kind === "fight" ? (
            <div className="encounter-identity">
              <CharacterPortrait
                className="portrait-frame encounter-portrait"
                src={enemyPortrait!}
                alt="Портрет противника"
              />
              <div className="encounter-info">
                <Text as="h3">{enemyName}</Text>
                {enemyDescription && <Text as="p">{enemyDescription}</Text>}
                <Text as="p" className="journey-node-level">
                  Уровень {enemyLevel}
                </Text>
                <Text as="p" className="encounter-type">
                  {enemyType}
                </Text>
              </div>
            </div>
          ) : (
            <>
              <img src={nodeImage(node)} alt="" />
              <Text as="span" className="eyebrow">
                {status}
              </Text>
            </>
          )}
          {description && <Text as="p">{description}</Text>}
        </>
        {!canVisit && (
          <Text as="p" className="muted">
            {status === "Вы здесь"
              ? "Вы уже находитесь в этой точке."
              : status === "Пройдено"
                ? "Эта точка уже пройдена. Вернуться назад нельзя."
                : "Сейчас сюда перейти нельзя. Сначала завершите текущую встречу и следуйте по доступным связям карты."}
          </Text>
        )}
      </div>
      <ModalFooter>
        <GothicTextButton
          type="button"
          variant="secondary"
          onClick={onClose}
          autoFocus
        >
          Отмена
        </GothicTextButton>
        {canVisit && (
          <GothicTextButton
            type="button"
            variant="primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {actionLabel ?? (node.kind === "fight" ? "Начать бой" : "Перейти")}
          </GothicTextButton>
        )}
      </ModalFooter>
    </Modal>
  );
}
