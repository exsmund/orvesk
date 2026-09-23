import { useEffect, useState } from "react";
import {
  CHARACTERS_KEY,
  savedCharacters,
  type CharacterReference,
  type StoragePort,
} from "./characters";
import type { PublicGame } from "../../game/types";

export type HeroLoader = (path: string, body?: unknown) => Promise<PublicGame>;
export type HeroEntry = CharacterReference & {
  game?: PublicGame;
  error?: string;
};
/** Loading a profile never changes play order. The first valid entry is the last played hero. */
export function useSavedHeroes(
  load: HeroLoader,
  storage: StoragePort = localStorage,
) {
  const [revision, setRevision] = useState(0);
  const [entries, setEntries] = useState<HeroEntry[]>(() =>
    savedCharacters(storage),
  );
  const [loaded, setLoaded] = useState<{
    load: HeroLoader;
    storage: StoragePort;
    revision: number;
  } | null>(null);
  const loading =
    loaded?.load !== load ||
    loaded?.storage !== storage ||
    loaded?.revision !== revision;
  useEffect(() => {
    const update = (e: StorageEvent) => {
      if (e.key === CHARACTERS_KEY || e.key === null) setRevision((n) => n + 1);
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  useEffect(() => {
    let active = true;
    const refs = savedCharacters(storage);
    Promise.all(
      refs.map(async (ref) => {
        try {
          return { ...ref, game: await load(`/sessions/${ref.id}`) };
        } catch (error) {
          return { ...ref, error: (error as Error).message };
        }
      }),
    ).then((next) => {
      if (active) {
        setEntries(next);
        setLoaded({ load, storage, revision });
      }
    });
    return () => {
      active = false;
    };
  }, [load, storage, revision]);
  return {
    entries,
    loading,
    retry: () => setRevision((n) => n + 1),
    update: (id: string, game: PublicGame) =>
      setEntries((previous) =>
        previous.map((entry) => (entry.id === id ? { ...entry, game } : entry)),
      ),
  };
}
