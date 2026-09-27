import { Popup } from "@/shared/ui/Popup";
import { Text } from "@/shared/ui/Text";
import { ActionSource } from "@/features/combat/ActionSource/ActionSource";
import { ActionFigure } from "@/features/combat/ActionFigure/ActionFigure";
import { interactionText } from "@/features/combat/ReactionBoard/model";
import { cellInteraction } from "@/game/combat/cell-interaction";
import {
  describeCellDamage,
  type CellDamageValues,
} from "@/features/combat/CellDamage/model";
import type { Maneuver } from "@/game/types";
import "@/features/combat/CellPopup/CellPopup.css";

export function CellPopup({
  anchor,
  player,
  enemy,
  rotation,
  compressed,
  rock = false,
  special,
  damage,
  onClose,
}: {
  anchor: HTMLElement;
  player?: Maneuver;
  enemy?: Maneuver;
  rotation?: number;
  compressed?: boolean;
  rock?: boolean;
  special?: string;
  damage?: CellDamageValues;
  onClose: () => void;
}) {
  return (
    <Popup anchor={anchor} onClose={onClose}>
      <div className="cell-popup">
        {player && (
          <div className="cell-popup-row">
            <div className="cell-popup-art">
              <ActionFigure
                m={player}
                rotation={rotation}
                compressed={compressed}
              />
            </div>
            <div>
              <Text as="strong" size="sm" color="accent">
                {player.name}
              </Text>
              <Text as="p" size="sm">
                {player.description}
              </Text>
            </div>
          </div>
        )}
        {player && enemy && (
          <div className="cell-popup-interaction">
            <Text as="p" size="sm" color="highlight">
              {interactionText[cellInteraction(player, enemy)]}
            </Text>
            {damage && (
              <Text as="p" size="sm">
                {describeCellDamage(damage)}.
              </Text>
            )}
          </div>
        )}
        {enemy && (
          <div className="cell-popup-row">
            <div className="cell-popup-art">
              <ActionSource m={enemy} size={64} />
            </div>
            <div>
              <Text as="strong" size="sm" color="accent">
                {enemy.name}
              </Text>
              <Text as="p" size="sm">
                {enemy.description}
              </Text>
            </div>
          </div>
        )}
        {!player && !enemy && (
          <Text as="p" size="sm">
            {rock
              ? "Камень: сюда нельзя разместить фигуру, кроме особенных фигур, которые игнорируют камни."
              : "Сюда можно разместить вашу фигуру."}
          </Text>
        )}
        {special && (
          <Text as="p" size="sm" color="muted">
            {special}
          </Text>
        )}
      </div>
    </Popup>
  );
}
