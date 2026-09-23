import { type NewCharacter } from "../characters/CharacterCreation";

import { useEffect, useRef, useState } from "react";

import { type PublicGame } from "../../game/types";

import { useReducedMotion } from "../combat/useReducedMotion";

import {
  canCreateCharacter,
  createSavedCharacter,
  forgetCharacter,
  rememberCharacter,
} from "../characters/characters";

import { request } from "../../shared/api/client";
const SESSION_KEY = "duelyant.session.v4";
export function useGameSession() {
  const [heroLimitOpen, setHeroLimitOpen] = useState(false);
  const [screen, setScreen] = useState<"home" | "heroes" | "create" | "game">(
    "home",
  );
  const [game, setGame] = useState<PublicGame | null>(null);
  const [session, setSession] = useState(() =>
    sessionStorage.getItem(SESSION_KEY),
  );
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  const actionLock = useRef(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (screen !== "game" || !session) return;
    let active = true;
    request(`/sessions/${session}`)
      .then((data) => {
        if (active) {
          setGame(data);
          rememberCharacter(localStorage, {
            id: session,
            name: data.player.name,
            portraitId: data.player.portraitId,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          sessionStorage.removeItem(SESSION_KEY);
          setSession(null);
          setScreen("home");
        }
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, screen]);

  function goHome() {
    if (busy) return;
    setError("");
    setGame(null);
    setScreen("home");
  }
  function openCharacter(id: string) {
    setError("");
    setGame(null);
    setLoading(true);
    sessionStorage.setItem(SESSION_KEY, id);
    setSession(id);
    setScreen("game");
  }
  function newCharacter() {
    if (!canCreateCharacter(localStorage)) {
      setHeroLimitOpen(true);
      return;
    }
    setError("");
    setGame(null);
    setScreen("create");
  }
  async function create(draft: NewCharacter) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await createSavedCharacter(
        localStorage,
        () => request<{ id: string; game: PublicGame }>("/sessions", draft),
        (data) =>
          rememberCharacter(localStorage, {
            id: data.id,
            name: data.game.player.name,
            portraitId: data.game.player.portraitId,
          }),
      );
      sessionStorage.setItem(SESSION_KEY, data.id);
      setSession(data.id);
      setGame(data.game);
      setLoading(false);
      setScreen("game");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteCharacter(id: string) {
    const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      throw new Error(data.error ?? "Не удалось удалить героя.");
    }
    forgetCharacter(localStorage, id);
    if (sessionStorage.getItem(SESSION_KEY) === id) {
      sessionStorage.removeItem(SESSION_KEY);
      setSession(null);
      setGame(null);
    }
  }

  async function sendAction(
    type:
      | "charm"
      | "finish-actions"
      | "turn"
      | "next"
      | "reward"
      | "reveal"
      | "resolve"
      | "clash"
      | "upgrade"
      | "travel",
    payload: object = {},
  ) {
    if (!game || busy || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      // The animation never rolls game RNG: only the server determines the outcome.
      const [data] = await Promise.all([
        request(`/sessions/${session}/action`, {
          type,
          round: game.round,
          fight: game.fight,
          phase: game.phase,
          stage: game.clash?.stage ?? game.planning?.stage,
          ...payload,
        }),
        new Promise<void>((resolve) =>
          setTimeout(
            resolve,
            (type === "turn" || type === "resolve") && !reducedMotion ? 950 : 0,
          ),
        ),
      ]);
      setGame(data);
      if (session)
        rememberCharacter(localStorage, {
          id: session,
          name: data.player.name,
          portraitId: data.player.portraitId,
        });
      return data;
    } catch (err) {
      const failure = err as Error & { game?: PublicGame };
      if (failure.game) setGame(failure.game);
      setError(failure.message);
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }

  return {
    heroLimitOpen,
    setHeroLimitOpen,
    screen,
    setScreen,
    game,
    session,
    loading,
    busy,
    error,
    setError,
    goHome,
    openCharacter,
    newCharacter,
    create,
    deleteCharacter,
    sendAction,
  };
}
export type GameSession = ReturnType<typeof useGameSession>;
