import { Text } from "@/shared/ui/Text";
import "@/features/combat/ClashOutcome/ClashOutcome.css";
import { BattleWorkspace } from "@/features/combat/BattleWorkspace/BattleWorkspace";

import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { CellPopup } from "@/features/combat/CellPopup";
import { CellDamage } from "@/features/combat/CellDamage";
import { describeCellDamage } from "@/features/combat/CellDamage/model";
import { clashResultCells } from "@/game/combat/clash-damage";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { TurnRecord } from "@/game/types";
import { RockTerrain } from "@/features/combat/RockTerrain/RockTerrain";

import { LayerIcon } from "@/features/combat/ReactionBoard/LayerIcon";
import { interactionText } from "@/features/combat/ReactionBoard/model";
export function ClashOutcome({
  turn,
  onDone,
  ending,
  showContinue = true,
  result,
  resultDescription,
}: {
  turn: TurnRecord;
  onDone: () => void;
  ending: string;
  showContinue?: boolean;
  result?: "victory" | "defeat" | "draw";
  resultDescription?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const r = turn.clash!,
    cells = clashResultCells(r),
    [selected, setSelected] = useState<number | null>(null),
    cell = selected === null ? null : cells[selected];
  return (
    <section
      className="board-combat reaction-board clash-outcome"
      aria-label={`Итог поля, ход ${turn.round}`}
    >
      <BattleWorkspace
        below={
          result && (
            <div className="battle-outcome-message" role="status">
              <Text as="strong">
                {result === "victory"
                  ? "Вы победили"
                  : result === "defeat"
                    ? "Вы погибли"
                    : "Ничья"}
              </Text>
              {resultDescription && (
                <Text as="p" size="sm" color="muted">
                  {resultDescription}
                </Text>
              )}
              {result === "defeat" && (
                <Text as="p">Ваши осколки останутся у противника</Text>
              )}
            </div>
          )
        }
      >
        <div
          className="action-board outcome-field terrain-board"
          role="group"
          aria-label="Урон по клеткам"
        >
          <RockTerrain
            blocked={r.blocked}
            unlocked={[r.playerModifiers.unlocked, r.enemyModifiers.unlocked]}
          />
          {cells.map((c) => {
            const rock =
              r.blocked.includes(c.index) &&
              r.playerModifiers.unlocked !== c.index &&
              r.enemyModifiers.unlocked !== c.index;
            return (
              <button
                key={c.index}
                onClick={(event) => {
                  setAnchor(event.currentTarget);
                  setSelected(c.index);
                }}
                className={`board-cell terrain-cell ${rock ? "rock" : "grass"} ${c.player ? "own-layer" : ""} ${c.enemy ? "enemy-layer" : ""}`}
                aria-pressed={selected === c.index}
                aria-label={`Клетка ${Math.floor(c.index / 3) + 1}, ${(c.index % 3) + 1}. ${describeCellDamage(c)}. ${interactionText[c.interaction]}`}
                title={describeCellDamage(c)}
              >
                <LayerIcon m={c.player} side="player" />
                <LayerIcon m={c.enemy} side="enemy" />
                <CellDamage damage={c} />
              </button>
            );
          })}
        </div>
      </BattleWorkspace>
      {cell && anchor && (
        <CellPopup
          anchor={anchor}
          player={cell.player}
          enemy={cell.enemy}
          rotation={
            r.playerPlaced.find((p) => p.id === cell.player?.id)?.rotation
          }
          compressed={r.playerModifiers.compressed === cell.player?.id}
          rock={
            r.blocked.includes(cell.index) &&
            r.playerModifiers.unlocked !== cell.index &&
            r.enemyModifiers.unlocked !== cell.index
          }
          damage={cell}
          onClose={() => setSelected(null)}
        />
      )}
      {showContinue && (
        <footer className="planning-footer planning-submit">
          <GothicTextButton width="action" onClick={onDone}>
            {ending}
            <ArrowRight size={16} />
          </GothicTextButton>
        </footer>
      )}
    </section>
  );
}
