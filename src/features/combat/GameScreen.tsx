import { CharacterCard } from "../characters/CharacterCard";
import { BattleHeader } from "./BattleHeader";
import { LegacyArena } from "./LegacyArena";
import { useGamePresentation } from "./useGamePresentation";

import { InitiativeRoll } from "./InitiativeRoll";

import { CombatBackdrop } from "./CombatBackdrop";
import { BattleModeDialog } from "./BattleModeDialog";
import { battleMode } from "../../game/combat/battle-modes";

import { ItemInspectionWindow } from "../equipment/ItemInspectionWindow";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";

import { FighterPanel } from "../characters/FighterPanel";
import { Modal } from "../../shared/ui/Modal";
import { VictoryRewardDialog } from "../rewards/VictoryRewardDialog";

import { level } from "../../game/progression/souls";
import React from "react";

import { Hand, Check, X } from "lucide-react";
import { item } from "../../game/equipment/catalog";
import { displaced, validateChoice } from "../../game/combat/engine";
import { type PublicGame } from "../../game/types";

import { formatDamage } from "../../game/combat/battle-feedback";

import { ItemInspection } from "../equipment/ItemInspection";
import { selectedReward } from "../../game/combat/tactics";
import { ReactionBoard, ClashOutcome } from "./ReactionBoard";
import { CombatReplay } from "./CombatReplay";

import { JourneyScreen } from "../journey/JourneyScreen";
import { JourneyChoices } from "../journey/AdventureUI";
import { ItemIcon } from "../equipment/ItemIcon";

import { Rules } from "../rules/Rules";

import { BattleJournal } from "./BattleJournal";
import { FighterDialog } from "../characters/FighterDialog";
import type { GameSession } from "../session/useGameSession";
export function GameScreen({
  game,
  session,
  busy,
  error,
  setError,
  sendAction,
  goHome,
}: {
  game: PublicGame;
  session: string;
  busy: boolean;
  error: string;
  setError: GameSession["setError"];
  sendAction: GameSession["sendAction"];
  goHome: () => void;
}) {
  const {
    confirmedBattle,
    setConfirmedBattle,
    setShownRoll,
    setResourcePreview,
    choice,
    setChoice,
    mapOpen,
    setMapOpen,
    modal,
    setModal,
    fighterInspection,
    setFighterInspection,
    inspection,
    setInspection,
    rewardIndex,
    setRewardIndex,
    feedback,
    replayOpen,
    replayCount,
    rewardOpen,
    setRewardOpen,
    reducedMotion,
    showReplayStep,
    act,
    p,
    latest,
    playable,
    battleKey,
    rollKey,
    rollPending,
    activePreview,
    showReplay,
    showClash,
    shownPlayer,
    shownEnemy,
    closeReplay,
  } = useGamePresentation(game, session, busy, sendAction);
  const reward = selectedReward(game, rewardIndex);
  const errorChoice = validateChoice(game, choice);
  const selectedItem = choice.itemId ? item(choice.itemId) : null;
  const dropped = selectedItem ? displaced(p, selectedItem) : [];
  const planningPanel =
    playable && game.clash ? (
      <ReactionBoard
        key={`clash4-${game.fight}-${game.round}-${game.clash.stage}`}
        game={game}
        busy={busy || rollPending}
        session={session!}
        forecastKey={rollKey}
        onForecast={setResourcePreview}
        onCharm={async (charm, target) =>
          !!(await sendAction("charm", { charm, target }))
        }
        onInspect={(id) => setInspection({ id, source: "ground" })}
        onSubmit={(payload) => act("clash", undefined, payload)}
        onFinish={() => void act("finish-actions")}
      />
    ) : (
      <section className="result-panel">
        <div className="result-content">
          {game.phase === "victory" ? (
            <button
              className="primary"
              onClick={() => {
                setMapOpen(true);
                setRewardOpen(true);
              }}
            >
              К награде
            </button>
          ) : (
            <>
              <h2>
                {game.phase === "draw"
                  ? "Поединок завершился ничьей"
                  : game.phase === "defeat"
                    ? "Возвращение к началу карты"
                    : "Следующий противник уже ждёт"}
              </h2>
              {game.phase === "defeat" && (
                <p>
                  Все непотраченные души потеряны. Характеристики, навыки и
                  снаряжение сохранены.
                </p>
              )}
              <button
                className="secondary"
                onClick={() => setFighterInspection("own")}
              >
                Персонаж и души
              </button>
              <JourneyChoices
                key={`${game.fight}:${game.phase}`}
                game={game}
                busy={busy}
                onNext={(payload) => act("travel", undefined, payload)}
                onInspect={(id) => setInspection({ id, source: "ground" })}
              />
            </>
          )}
        </div>
      </section>
    );

  const turnPanel = showClash ? (
    <ClashOutcome
      key={`${game.fight}:${latest.round}`}
      turn={latest}
      result={
        game.phase === "victory" ||
        game.phase === "defeat" ||
        game.phase === "draw"
          ? game.phase
          : undefined
      }
      onDone={closeReplay}
      ending={
        playable
          ? "К следующему раунду"
          : game.phase === "victory"
            ? "К награде"
            : "На карту"
      }
    />
  ) : showReplay ? (
    <CombatReplay
      key={`${game.fight}:${latest.round}`}
      turn={latest}
      count={replayCount}
      onCount={showReplayStep}
      onDone={closeReplay}
      reduced={reducedMotion}
      active
      ending={
        playable
          ? "К следующему ходу"
          : game.phase === "victory"
            ? "К награде"
            : "На карту"
      }
    />
  ) : (
    <>{planningPanel}</>
  );
  const groundPicker = (
    <div className="ground-selection">
      <div className="ground-title">
        <Hand size={16} />
        <strong>На камнях арены</strong>
        <span>Выберите предмет. Подбор займёт ход.</span>
      </div>
      <div className="ground-items">
        {[...new Set([...game.ground, ...(p.gear.weapon ? ["fist"] : [])])].map(
          (id) => (
            <button
              className={choice.itemId === id ? "chosen" : ""}
              key={id}
              disabled={busy}
              onClick={() => setChoice({ ...choice, itemId: id })}
            >
              <ItemIcon equipment={item(id)} />
              <span>{id === "fist" ? "Бросить оружие" : item(id).name}</span>
              {item(id).hands === 2 && <small>2 руки</small>}
              {choice.itemId === id && <Check size={15} />}
            </button>
          ),
        )}
      </div>
      {selectedItem && (
        <div className="swap-preview">
          <ItemInspection
            equipment={selectedItem}
            player={p}
            source="На арене"
          />
          {dropped.length > 0 && (
            <p className="accent">
              На земле останется: {dropped.map((i) => i.name).join(", ")}.
            </p>
          )}
        </div>
      )}
      {errorChoice && <p className="muted">{errorChoice}</p>}
    </div>
  );
  const mapScreen = !!game.journey && (game.phase === "ready" || mapOpen);
  return (
    <div className={mapScreen ? "journey-shell" : "app combat-app"}>
      {mapScreen ? (
        <JourneyScreen
          game={game}
          busy={busy}
          onNext={(payload) => {
            setMapOpen(false);
            setModal(null);
            if (game.phase !== "combat") void act("travel", undefined, payload);
          }}
          onInspect={(id) => setInspection({ id, source: "ground" })}
          onHome={goHome}
          onHero={() => setFighterInspection("own")}
          onRules={() => setModal("rules")}
          onReward={() => {
            if (replayOpen) closeReplay();
            setRewardOpen(true);
          }}
        />
      ) : (
        <>
          <CombatBackdrop journey={game.journey} />
          <BattleHeader
            screen="battle"
            player={shownPlayer}
            enemy={shownEnemy}
            mode={battleMode(game.journey)}
            playerPreview={activePreview?.player}
            enemyPreview={activePreview?.enemy}
            onPlayer={() => setFighterInspection("own")}
            onEnemy={() => setFighterInspection("enemy")}
          />
          <main>
            <section className="arena-layout" aria-label="Арена боя">
              <FighterPanel
                fighter={shownPlayer}
                preview={activePreview?.player}
                onOpen={() => setFighterInspection("own")}
                damage={feedback?.player}
                damageId={feedback?.id}
                onInspect={(equipment) =>
                  setInspection({ id: equipment.id, source: "own" })
                }
              />
              <div className="battle-center">
                <div className="fight-tab-content">
                  <LegacyArena
                    game={game}
                    choice={choice}
                    feedback={feedback}
                  />
                  {turnPanel}
                </div>
              </div>
              <FighterPanel
                fighter={shownEnemy}
                preview={activePreview?.enemy}
                onOpen={() => setFighterInspection("enemy")}
                enemy
                damage={feedback?.enemy}
                damageId={feedback?.id}
                onInspect={(equipment) =>
                  setInspection({ id: equipment.id, source: "enemy" })
                }
              />
            </section>
            <div className="sr-only" role="status">
              {feedback &&
                [
                  feedback.player > 0
                    ? `Вы потеряли ${formatDamage(feedback.player)} здоровья.`
                    : "",
                  feedback.enemy > 0
                    ? `Противник потерял ${formatDamage(feedback.enemy)} здоровья.`
                    : "",
                ].join(" ")}
            </div>
          </main>
        </>
      )}
      {error && (
        <div className="error banner" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Скрыть ошибку">
            <X size={16} />
          </button>
        </div>
      )}
      {rollPending &&
        game.clash &&
        !mapScreen &&
        !replayOpen &&
        confirmedBattle === battleKey && (
          <InitiativeRoll
            key={rollKey}
            playerDie={game.clash.playerDie}
            enemyDie={game.clash.enemyDie}
            playerReaction={p.stats.reaction}
            enemyReaction={game.enemy.stats.reaction}
            playerName={p.name}
            enemyName={game.enemy.name}
            preparer={game.clash.preparer}
            onComplete={() => setShownRoll(rollKey)}
          />
        )}
      {playable && !mapScreen && confirmedBattle !== battleKey && (
        <BattleModeDialog
          mode={battleMode(game.journey)}
          onContinue={() => setConfirmedBattle(battleKey)}
        />
      )}
      {rewardOpen && !replayOpen && game.phase === "victory" && (
        <VictoryRewardDialog
          game={game}
          busy={busy}
          index={rewardIndex}
          onSelect={setRewardIndex}
          onClaim={(selection, replaceSkillId, skillSlot) =>
            void act("reward", selection, { replaceSkillId, skillSlot })
          }
          onSpend={(stat) =>
            void act("upgrade", stat, {
              expectedLevel: level(p),
              expectedSouls: game.souls,
            })
          }
          error={error}
        />
      )}
      {modal && (
        <Modal
          size="medium"
          title={
            modal === "journal"
              ? "Хроника поединка"
              : modal === "rules"
                ? "Законы арены"
                : modal === "ground"
                  ? "Предметы на арене"
                  : "Награда"
          }
          close={() => setModal(null)}
        >
          {modal === "journal" ? (
            <BattleJournal game={game} />
          ) : modal === "rules" ? (
            <Rules />
          ) : modal === "reward" && reward?.kind === "item" ? (
            <ItemInspection
              equipment={item(reward.itemId)}
              player={p}
              source="Награда"
            />
          ) : modal === "ground" ? (
            <div className="ground-modal">
              {groundPicker}
              <GothicTextButton
                className="primary"
                disabled={!!errorChoice || busy}
                onClick={() => setModal(null)}
              >
                Выбрать
                <Check size={16} />
              </GothicTextButton>
            </div>
          ) : null}
        </Modal>
      )}
      {fighterInspection === "own" && (
        <CharacterCard
          fighter={mapScreen ? p : shownPlayer}
          souls={game.souls}
          busy={busy}
          canUpgrade={game.phase !== "combat"}
          preview={mapScreen ? undefined : activePreview?.player}
          close={() => setFighterInspection(null)}
          onInspect={(id) => setInspection({ id, source: "own" })}
          onUpgrade={(stat) =>
            void act("upgrade", stat, {
              expectedLevel: level(p),
              expectedSouls: game.souls,
            })
          }
          onHome={goHome}
          onRules={() => setModal("rules")}
          onMap={!mapScreen ? () => setMapOpen(true) : undefined}
          onJournal={!mapScreen ? () => setModal("journal") : undefined}
        />
      )}
      {fighterInspection === "enemy" && (
        <FighterDialog
          side={fighterInspection}
          fighter={shownEnemy}
          game={game}
          busy={busy}
          close={() => setFighterInspection(null)}
          onInspect={(id) => setInspection({ id, source: fighterInspection })}
          onUpgrade={(stat) =>
            void act("upgrade", stat, {
              expectedLevel: level(p),
              expectedSouls: game.souls,
            })
          }
        />
      )}
      {inspection && (
        <ItemInspectionWindow
          close={() => setInspection(null)}
          equipment={item(inspection.id)}
          player={p}
          opponent={
            inspection.source === "enemy" && playable ? game.enemy : undefined
          }
          own={inspection.source === "own"}
          source={
            inspection.source === "own"
              ? "Ваша экипировка"
              : inspection.source === "enemy"
                ? "Экипировка противника"
                : "На арене"
          }
        />
      )}
    </div>
  );
}
