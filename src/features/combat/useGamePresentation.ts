import type { CombatResourcePreview } from "./resource-preview";

import { useEffect, useState } from "react";

import { type Choice, type PublicGame } from "../../game/types";

import { useReducedMotion } from "./useReducedMotion";
import { turnFeedback } from "../../game/combat/battle-feedback";

import { actionCost, stamina } from "../../game/combat/tactics";

import type { GameSession } from "../session/useGameSession";

export function useGamePresentation(
  game: PublicGame,
  session: string,
  busy: boolean,
  sendAction: GameSession["sendAction"],
) {
  const [confirmedBattle, setConfirmedBattle] = useState("");
  const [shownRoll, setShownRoll] = useState("");
  const [resourcePreview, setResourcePreview] =
    useState<CombatResourcePreview | null>(null);
  const [choice, setChoice] = useState<Choice>({ action: "attack", step: 1 });
  const [mapOpen, setMapOpen] = useState(true);
  const [modal, setModal] = useState<
    "rules" | "ground" | "reward" | "journal" | null
  >(null);
  const [fighterInspection, setFighterInspection] = useState<
    "own" | "enemy" | null
  >(null);
  const [inspection, setInspection] = useState<{
    id: string;
    source: "own" | "enemy" | "ground";
  } | null>(null);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [feedback, setFeedback] =
    useState<ReturnType<typeof turnFeedback>>(null);
  const [replayOpen, setReplayOpen] = useState(false),
    [replayCount, setReplayCount] = useState(0);
  const [rewardOpen, setRewardOpen] = useState(false);

  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 1900);
    return () => clearTimeout(timer);
  }, [feedback]);
  function showReplayStep(count: number) {
    setReplayCount(count);
    const trace = game?.log[0]?.replay;
    if (!replayOpen || !game || !trace || !count) {
      setFeedback(null);
      return;
    }
    const before = count === 1 ? trace.initial : trace.steps[count - 2].after,
      after = trace.steps[count - 1].after;
    setFeedback({
      id: `${game.fight}:${game.log[0].round}:${count}`,
      player: Math.max(
        0,
        Math.round((before.player.hp - after.player.hp) * 10) / 10,
      ),
      enemy: Math.max(
        0,
        Math.round((before.enemy.hp - after.enemy.hp) * 10) / 10,
      ),
    });
  }

  async function act(
    type: Parameters<GameSession["sendAction"]>[0],
    selection?: string,
    payload: object = {},
  ) {
    if (busy) return;
    setFeedback(null);
    const data = await sendAction(type, {
      choice,
      selection,
      rewardIndex,
      ...payload,
    });
    if (!data) return;
    if (type === "reward") {
      setRewardOpen(false);
      setMapOpen(true);
    }
    if (type !== "upgrade" && (type !== "turn" || data.phase !== "combat"))
      setRewardIndex(0);
    if (type === "finish-actions") {
      setReplayOpen(true);
      setReplayCount(0);
    } else if (type === "clash" && data.log[0]?.clash) {
      setReplayCount(0);
      setReplayOpen(true);
      setFeedback(turnFeedback(game, data));
    } else if (type === "resolve" && data.log[0]?.replay) {
      setReplayCount(0);
      setReplayOpen(true);
    } else if (type === "turn" || type === "resolve")
      setFeedback(turnFeedback(game, data));
    if (type === "next" || type === "travel") {
      setShownRoll("");
      setReplayOpen(false);
      setReplayCount(0);
      setChoice({ action: "attack", step: 1 });
    } else if (actionCost(data.player, choice) > stamina(data.player))
      setChoice({ action: "rest", step: 0 });
    else if (choice.action === "equip")
      setChoice({ action: "attack", step: 0 });
  }

  const p = game.player,
    latest = game.log[0],
    playable = game.phase === "combat";
  const battleKey = `${session}:${game.journey?.expedition}:${game.fight}`;
  const rollKey = `${battleKey}:${game.round}`;
  const rollPending = playable && !!game.clash && shownRoll !== rollKey;
  const activePreview =
    !replayOpen &&
    !mapOpen &&
    !rollPending &&
    playable &&
    resourcePreview?.key === rollKey
      ? resourcePreview
      : null;
  const trace = latest?.replay,
    showReplay = replayOpen && !!trace,
    showClash = replayOpen && !!latest?.clash;
  const frame = showReplay
    ? replayCount
      ? trace.steps[replayCount - 1].after
      : trace.initial
    : null;
  const shownPlayer = frame ? { ...p, ...frame.player } : p,
    shownEnemy = frame ? { ...game.enemy, ...frame.enemy } : game.enemy;
  const closeReplay = () => {
    sessionStorage.setItem(
      `duelyant.replay.${session}`,
      `${game.fight}:${latest.round}`,
    );
    setReplayOpen(false);
    setFeedback(null);
    if (game.phase === "victory") setRewardOpen(true);
    else if (!playable) setMapOpen(true);
  };

  return {
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
  };
}
