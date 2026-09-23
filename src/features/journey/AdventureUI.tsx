import { ModalFooter } from "../../shared/ui/ModalFooter";
import { ItemArtwork } from "../equipment/EquipmentDoll";
import "../rewards/reward-dialog.css";
import { BattleModeArtwork } from "../combat/BattleModeArtwork";
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
      <BattleModeArtwork mode={mode} decorative />
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
    <section className="journey-choices" aria-label="Путь к боссу">
      <h3>
        {j.finished
          ? "Босс повержен!"
          : restart
            ? "Возвращение к началу карты"
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
                : "Персонаж и снаряжение сохраняются. Путь по этой карте начнётся с первого противника."}{" "}
            Новый бой начнётся с полным здоровьем.
          </p>
          <GothicTextButton
            className="primary"
            disabled={busy}
            onClick={() => onNext({})}
          >
            {retry
              ? "Повторить бой"
              : j.finished
                ? "Новое путешествие"
                : "Начать сначала"}
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
    atForge = node?.kind === "forge" && !j.forgeResolved,
    removed = forge ? displaced(game.player, item(forge)) : [];
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
        <>
          <div className="forge-content journey-node-details">
            {atForge ? (
              <>
                <div
                  className="reward-gallery"
                  role="group"
                  aria-label="Предметы кузницы"
                >
                  {j.offers?.map((id) => (
                    <button
                      type="button"
                      className="reward-tile"
                      key={id}
                      aria-label={item(id).name}
                      aria-pressed={forge === id}
                      disabled={busy}
                      onClick={() => setForge(id)}
                    >
                      <ItemArtwork equipment={item(id)} size={160} />
                    </button>
                  ))}
                </div>
                {forge && (
                  <>
                    {!canUse(game.player, item(forge)) && (
                      <p className="accent">
                        Не выполнены требования предмета.
                      </p>
                    )}
                    <GothicTextButton
                      className="secondary"
                      onClick={() => onInspect(forge)}
                    >
                      Свойства предмета
                    </GothicTextButton>
                    {removed.length > 0 && (
                      <div
                        className="forge-removed"
                        role="group"
                        aria-label="Предметы, которые будут потеряны"
                      >
                        <p className="forge-removed-label">Вы теряете:</p>
                        {removed.map((equipment) => (
                          <div
                            className="forge-removed-item"
                            key={equipment.id}
                            role="img"
                            aria-label={`Будет потерян: ${equipment.name}`}
                            title={`Будет потерян: ${equipment.name}`}
                          >
                            <ItemArtwork equipment={equipment} size={96} />
                            <svg viewBox="0 0 100 100" aria-hidden="true">
                              <path d="M8 8 92 92 M92 8 8 92" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p role="status">
                Кузница пройдена. Выберите следующего противника на карте.
              </p>
            )}
          </div>
          {atForge && (
            <ModalFooter hint="Вы можете взять один предмет или не брать ничего">
              <GothicTextButton
                className="secondary"
                disabled={busy}
                onClick={() => onNext({ forge: true, fromNode: current })}
              >
                Ничего не брать
              </GothicTextButton>
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
                {removed.length ? "Заменить предмет" : "Взять предмет"}
              </GothicTextButton>
            </ModalFooter>
          )}
        </>
      )}
    </>
  );
}
