import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { BATTLE_MODES, battleMode } from "../../game/combat/battle-modes";
import { useState } from "react";
import { SPECIAL_CELLS } from "../../game/combat/battle-traits";

import { JourneyMap } from "./JourneyMap";
import {
  currentJourneyNode,
  journeyNode,
} from "../../game/journey/journey-map";
import { item } from "../../game/equipment/catalog";
import { canUse, displaced, maxHp } from "../../game/combat/engine";
import type { PublicGame, SpecialCell } from "../../game/types";
import "./adventure.css";
export function SpecialMark({
  special,
  index,
}: {
  special?: SpecialCell;
  index: number;
}) {
  return special?.index === index ? (
    <span
      className={`special-cell special-${special.kind}`}
      title={SPECIAL_CELLS[special.kind].description}
    >
      {SPECIAL_CELLS[special.kind].symbol}
    </span>
  ) : null;
}
export function BattleModeInfo({
  game,
  compact = false,
}: {
  game: PublicGame;
  compact?: boolean;
}) {
  const mode = battleMode(game.journey),
    info = BATTLE_MODES[mode];
  return (
    <details className="battle-mode" open={!compact}>
      <summary>Режим путешествия: {info.name}</summary>
      <p>{info.description} Правила одинаковы для обеих сторон.</p>
      {mode !== "limited" && (
        <p>
          Скалы и собственные фигуры перекрывать нельзя. Штраф равновесия и
          бонус клеток элиты не действуют.
        </p>
      )}
      {mode === "expendable" && (
        <p>
          Можно пропустить ход, сохранив фигуры. Подъём доступен после каждого
          падения. Если у обоих закончились атаки и подбор не может дать новые —
          ничья и повтор боя.
        </p>
      )}
    </details>
  );
}
export function JourneyChoices({
  game,
  busy,
  onNext,
  onInspect,
}: {
  game: PublicGame;
  busy: boolean;
  onNext: (payload: object) => void;
  onInspect: (id: string) => void;
}) {
  const j = game.journey;
  if (!j)
    return (
      <GothicTextButton
        className="primary"
        disabled={busy}
        onClick={() => onNext({})}
      >
        Новый бой
      </GothicTextButton>
    );
  const restart = game.phase === "defeat" || j.finished,
    retry = game.phase === "draw",
    current = currentJourneyNode(j),
    node = journeyNode(current, j);
  return (
    <section className="journey-choices" aria-label="Путь к чемпиону">
      <h3>
        {j.finished
          ? "Чемпион повержен!"
          : restart
            ? "Путешествие окончено"
            : retry
              ? "Повторить поединок"
              : node?.kind === "fight"
                ? "Выберите, куда идти"
                : node?.name}
      </h3>
      <BattleModeInfo game={game} />
      {!restart && !retry && (
        <>
          <JourneyStop
            game={game}
            busy={busy}
            onNext={onNext}
            onInspect={onInspect}
          />
        </>
      )}
      <JourneyMap
        game={game}
        busy={busy}
        onVisit={(nodeId) => onNext({ nodeId, fromNode: current })}
      />
      {restart || retry ? (
        <>
          <p>
            {j.finished
              ? "Пять побед за путешествие. Персонаж и снаряжение остаются с вами."
              : retry
                ? "Ничья не сбрасывает пройденный путь."
                : "Персонаж и снаряжение сохраняются. Новое путешествие начнётся с первого противника."}{" "}
            Новый бой начнётся с полным здоровьем.
          </p>
          <GothicTextButton
            className="primary"
            disabled={busy}
            onClick={() => onNext({})}
          >
            {retry ? "Повторить бой" : "Новое путешествие"}
          </GothicTextButton>
        </>
      ) : (
        <>
          <p>
            Выберите подсвеченный узел. Костёр лечит полностью, кузница — на 50%
            максимального здоровья. Прямой переход к противнику не лечит.
          </p>
        </>
      )}
    </section>
  );
}

export function JourneyStop({
  game,
  busy,
  onNext,
  onInspect,
}: {
  game: PublicGame;
  busy: boolean;
  onNext: (payload: object) => void;
  onInspect: (id: string) => void;
}) {
  const [forge, setForge] = useState(""),
    j = game.journey;
  if (!j) return null;
  const current = currentJourneyNode(j),
    node = journeyNode(current, j),
    atForge = node?.kind === "forge" && !j.forgeResolved;
  return (
    <>
      {" "}
      {node?.kind === "camp" && (
        <div className="journey-stop" role="status">
          <h4>Отдых у костра</h4>
          <p>
            Здоровье восстановлено: {game.player.hp}/{maxHp(game.player)}.
            Выберите следующего противника на карте.
          </p>
        </div>
      )}
      {node?.kind === "forge" && (
        <div className="journey-stop">
          <h4>Кузница</h4>
          <p>
            Вы восстановили до 50% максимального здоровья. Сейчас:{" "}
            {game.player.hp}/{maxHp(game.player)}.
          </p>
          {atForge ? (
            <>
              <p>Можно заменить одну вещь. Старый предмет теряется.</p>
              <select
                aria-label="Предмет кузницы"
                value={forge}
                disabled={busy}
                onChange={(e) => setForge(e.target.value)}
              >
                <option value="">Выберите предмет</option>
                {j.offers?.map((id) => (
                  <option
                    key={id}
                    value={id}
                    disabled={!canUse(game.player, item(id))}
                  >
                    {item(id).name}
                  </option>
                ))}
              </select>
              {forge && (
                <>
                  <GothicTextButton
                    className="secondary"
                    onClick={() => onInspect(forge)}
                  >
                    Свойства предмета
                  </GothicTextButton>
                  <small>
                    Снимется:{" "}
                    {displaced(game.player, item(forge))
                      .map((i) => i.name)
                      .join(", ") || "ничего"}
                    .
                  </small>
                </>
              )}
              <div className="journey-stop-actions">
                <GothicTextButton
                  className="primary"
                  disabled={
                    busy ||
                    !forge ||
                    !j.offers?.includes(forge) ||
                    !canUse(game.player, item(forge))
                  }
                  onClick={() =>
                    onNext({ forge: true, fromNode: current, itemId: forge })
                  }
                >
                  Заменить предмет
                </GothicTextButton>
                <GothicTextButton
                  className="secondary"
                  disabled={busy}
                  onClick={() => onNext({ forge: true, fromNode: current })}
                >
                  Оставить своё снаряжение
                </GothicTextButton>
              </div>
            </>
          ) : (
            <p role="status">
              Кузница пройдена. Выберите следующего противника на карте.
            </p>
          )}
        </div>
      )}
    </>
  );
}
