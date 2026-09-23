import React from "react";

import { Crosshair, Trophy } from "lucide-react";

import { reaches } from "../../game/combat/engine";
import { type Choice, type PublicGame } from "../../game/types";
import { FloatingDamage } from "./BattleEffects";

import { turnFeedback } from "../../game/combat/battle-feedback";

import { Figure } from "./LegacyFigure";

export function LegacyArena({
  game,
  choice,
  feedback,
}: {
  game: PublicGame;
  choice: Choice;
  feedback: ReturnType<typeof turnFeedback>;
}) {
  const p = game.player;
  const playable = game.phase === "combat";
  const offensive = ["attack", "heavy", "kick", "shield"].includes(
    choice.action,
  );
  return (
    <div className="arena">
      <div className="arena-top">
        <span>
          <span className="live-dot" />
          {playable
            ? "ПОЕДИНОК"
            : game.phase === "defeat"
              ? "ПОРАЖЕНИЕ"
              : "ПОБЕДА"}
        </span>
        <span>ВЫ ХОДИТЕ ПЕРВЫМ</span>
      </div>
      <div className="arena-geometry">
        <div />
        <div />
        <div />
      </div>
      <div className="arena-center-mark">✧</div>
      <div
        className="combatants"
        style={
          {
            "--fighter-gap": `${Math.min(19, Math.max(0, (game.distance - 40) / 12))}%`,
          } as React.CSSProperties
        }
      >
        <div
          className={`combatant player ${feedback?.player ? "took-hit" : ""}`}
        >
          <span className="fighter-label">ВЫ</span>
          <Figure fighter={p} />
          {feedback && (
            <FloatingDamage key={feedback.id} amount={feedback.player} />
          )}
          <div className="fighter-base" />
        </div>
        <div className="versus">VS</div>
        <div className={`combatant enemy ${feedback?.enemy ? "took-hit" : ""}`}>
          <span className="fighter-label">ПРОТИВНИК</span>
          <Figure fighter={game.enemy} enemy />
          {feedback && (
            <FloatingDamage key={feedback.id} amount={feedback.enemy} />
          )}
          <div className="fighter-base" />
        </div>
      </div>
      <div className="arena-reach">
        {playable ? (
          <>
            <span
              className={
                offensive && !reaches(game, choice)
                  ? "reach-icon out"
                  : "reach-icon"
              }
            >
              <Crosshair size={16} />
            </span>
            <div>
              <strong>
                {p.prone
                  ? "Нужно подняться"
                  : offensive
                    ? reaches(game, choice)
                      ? "Удар достанет"
                      : "Удар не достанет"
                    : choice.action === "equip"
                      ? "Смена экипировки"
                      : choice.action === "rest"
                        ? "Восстановление сил"
                        : "Защитная стойка"}
              </strong>
              <small>
                {p.prone
                  ? "Следующий ход — без других действий"
                  : offensive
                    ? "С учётом вашего шага · противник может сместиться"
                    : choice.action === "equip"
                      ? "В этот ход вы не атакуете"
                      : choice.action === "rest"
                        ? "+3 силы · +2 устойчивости"
                        : "Защита действует весь ход"}
              </small>
            </div>
          </>
        ) : (
          <>
            <Trophy size={20} />
            <strong>
              {game.phase === "defeat"
                ? "Арена ждёт вашего возвращения"
                : "Этот круг — за вами"}
            </strong>
          </>
        )}
      </div>
      <div className="arena-bottom">
        <span>КАМЕННАЯ АРЕНА</span>
        <span>ОБОЮДНЫЙ ВЫБОР · D20</span>
      </div>
    </div>
  );
}
