import type { CombatResourcePreview } from "@/features/combat/resource-preview";

import { useEffect, useState } from "react";

import { type PublicGame } from "@/game/types";

import { turnFeedback } from "@/game/combat/battle-feedback";

import type { GameSession } from "@/features/session/useGameSession";

export function useGamePresentation(
  game: PublicGame,
  session: string,
  busy: boolean,
  sendAction: GameSession["sendAction"],
) {
  const [confirmedBattle, setConfirmedBattle] = useState("");
  const [shownNotice, setShownNotice] = useState("");
  const [resourcePreview, setResourcePreview] =
    useState<CombatResourcePreview | null>(null);
  const [mapOpen, setMapOpen] = useState(true);
  const [modal, setModal] = useState<"rules" | null>(null);
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
  const [replayOpen, setReplayOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 1900);
    return () => clearTimeout(timer);
  }, [feedback]);
  async function act(
    type: Parameters<GameSession["sendAction"]>[0],
    selection?: string,
    payload: object = {},
  ) {
    if (busy) return;
    setFeedback(null);
    const data = await sendAction(type, {
      selection,
      rewardIndex,
      ...payload,
    });
    if (!data) return;
    if (type === "travel" && data.phase === "ready") setMapOpen(true);
    if (type === "reward") {
      setRewardOpen(false);
      setMapOpen(true);
    }
    if (type !== "upgrade") setRewardIndex(0);
    if (type === "finish-actions") {
      setReplayOpen(true);
    } else if (
      type === "clash" &&
      data.log[0]?.clash &&
      data.round !== game.round
    ) {
      setReplayOpen(true);
      setFeedback(turnFeedback(game, data));
    }
    if (type === "next" || type === "travel") {
      setShownNotice("");
      setReplayOpen(false);
    }
  }

  const p = game.player,
    latest =
      game.phase === "defeat"
        ? (game.log.find((turn) => turn.clash) ?? game.log[0])
        : game.log[0],
    playable = game.phase === "combat";
  const battleKey = `${session}:${game.journey?.expedition}:${game.fight}`;
  const turnKey = `${battleKey}:${game.round}`;
  const noticePending = playable && !!game.clash && shownNotice !== turnKey;
  const activePreview =
    !replayOpen && !mapOpen && playable && resourcePreview?.key === turnKey
      ? resourcePreview
      : null;
  const showClash = (replayOpen || game.phase === "defeat") && !!latest?.clash;
  const shownPlayer = p,
    shownEnemy = game.enemy;
  const closeReplay = () => {
    if (game.phase === "defeat") {
      void act("travel", undefined, { restart: true });
      return;
    }
    setReplayOpen(false);
    setFeedback(null);
    if (game.phase === "victory") setRewardOpen(true);
    else if (!playable) setMapOpen(true);
  };

  return {
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
  };
}
