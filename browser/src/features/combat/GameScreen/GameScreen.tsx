import { Text } from "@/shared/ui/Text";
import "@/features/combat/GameScreen/GameScreen.css";
import { X } from "lucide-react";
import { formatDamage } from "@/game/combat/battle-feedback";
import { battleMode } from "@/game/combat/battle-modes";
import { item } from "@/game/equipment/catalog";
import { level } from "@/game/progression/souls";
import { type PublicGame } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { CharacterCard } from "@/features/characters/CharacterCard/CharacterCard";
import { FighterDialog } from "@/features/characters/FighterDialog/FighterDialog";
import { FighterPanel } from "@/features/characters/FighterPanel/FighterPanel";
import { ItemInspectionWindow } from "@/features/equipment/ItemInspectionWindow/ItemInspectionWindow";
import { JourneyChoices } from "@/features/journey/JourneyChoices/JourneyChoices";
import { JourneyScreen } from "@/features/journey/JourneyScreen/JourneyScreen";
import { VictoryRewardDialog } from "@/features/rewards/VictoryRewardDialog/VictoryRewardDialog";
import { Rules } from "@/features/rules/Rules/Rules";
import type { GameSession } from "@/features/session/useGameSession";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";
import { BattleModeDialog } from "@/features/combat/BattleModeDialog/BattleModeDialog";
import { ClashOutcome } from "@/features/combat/ClashOutcome/ClashOutcome";
import { CombatBackdrop } from "@/features/combat/CombatBackdrop/CombatBackdrop";

import { Notification } from "@/shared/ui/Notification";

import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import { useGamePresentation } from "@/features/combat/useGamePresentation";
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
    setShownNotice,
    setResourcePreview,
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
    rewardOpen,
    setRewardOpen,
    act,
    p,
    latest,
    playable,
    battleKey,
    turnKey,
    noticePending,
    activePreview,
    showClash,
    shownPlayer,
    shownEnemy,
    closeReplay,
  } = useGamePresentation(game, session, busy, sendAction);
  const resultDescription =
    game.phase === "victory" &&
    battleMode(game.journey) === "expendable" &&
    game.enemy.hp > 0
      ? "Фигуры закончились. Вы победили, потому что у вас осталось больше здоровья."
      : undefined;
  const planningPanel =
    playable && game.clash ? (
      <ReactionBoard
        key={`clash5-${game.fight}-${game.round}-${game.clash.stage}`}
        game={game}
        busy={busy}
        session={session!}
        forecastKey={turnKey}
        onForecast={setResourcePreview}
        onExchange={async (cardId) => {
          await sendAction("exchange", { cardId });
        }}
        onCharm={async (charm, target) =>
          !!(await sendAction("charm", { charm, target }))
        }
        onSubmit={(payload) => act("clash", undefined, payload)}
        onFinish={() => void act("finish-actions")}
      />
    ) : (
      <section className="result-panel">
        <div className="result-content">
          {resultDescription && <Text as="p">{resultDescription}</Text>}
          {game.phase === "victory" ? (
            <button
              className="primary"
              onClick={() => {
                setMapOpen(true);
                setRewardOpen(true);
              }}
            >
              <Text>К награде</Text>
            </button>
          ) : (
            <>
              <Text as="h2">
                {game.phase === "draw"
                  ? "Поединок завершился ничьей"
                  : game.phase === "defeat"
                    ? "Вы проиграли"
                    : "Следующий противник уже ждёт"}
              </Text>
              {game.phase === "defeat" && (
                <Text as="p">
                  Все непотраченные осколки потеряны. Характеристики, навыки и
                  снаряжение сохранены.
                </Text>
              )}
              <button
                className="secondary"
                onClick={() => setFighterInspection("own")}
              >
                <Text>Персонаж и осколки</Text>
              </button>
              {game.phase === "defeat" ? (
                <GothicTextButton
                  disabled={busy}
                  onClick={() =>
                    void act("travel", undefined, { restart: true })
                  }
                >
                  Начать с начала
                </GothicTextButton>
              ) : (
                <JourneyChoices
                  key={`${game.fight}:${game.phase}`}
                  game={game}
                  busy={busy}
                  onNext={(payload) => act("travel", undefined, payload)}
                  onInspect={(id) => setInspection({ id, source: "ground" })}
                />
              )}
            </>
          )}
        </div>
      </section>
    );

  const turnPanel = showClash ? (
    <ClashOutcome
      key={`${game.fight}:${latest.round}`}
      turn={latest}
      resultDescription={resultDescription}
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
            : game.phase === "defeat"
              ? "Начать с начала"
              : "На карту"
      }
    />
  ) : (
    <>{planningPanel}</>
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
            if (game.phase !== "combat" && game.phase !== "defeat")
              void act("travel", undefined, payload);
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
            mapNumber={game.journey?.expedition ?? 1}
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
                <div className="fight-tab-content">{turnPanel}</div>
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
              <Text>
                {feedback &&
                  [
                    feedback.player > 0
                      ? `Вы потеряли ${formatDamage(feedback.player)} здоровья.`
                      : "",
                    feedback.enemy > 0
                      ? `Противник потерял ${formatDamage(feedback.enemy)} здоровья.`
                      : "",
                  ].join(" ")}
              </Text>
            </div>
          </main>
        </>
      )}
      {error && (
        <div className="error banner" role="alert">
          <Text>{error}</Text>
          <button onClick={() => setError("")} aria-label="Скрыть ошибку">
            <X size={16} />
          </button>
        </div>
      )}
      {noticePending &&
        game.clash &&
        !mapScreen &&
        !replayOpen &&
        confirmedBattle === battleKey && (
          <Notification
            key={turnKey}
            message={
              game.clash.preparer === "player"
                ? "Вы ходите первый"
                : "Противник сходил, вы реагируете"
            }
            onClose={() => setShownNotice(turnKey)}
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
        <Modal size="medium" title="Законы арены" close={() => setModal(null)}>
          <Rules />
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
