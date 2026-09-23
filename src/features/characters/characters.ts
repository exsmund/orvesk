export const CHARACTERS_KEY = "duelyant.characters.v2";
export interface CharacterReference {
  id: string;
  name?: string;
  portraitId?: string;
}
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
const validId = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
export function savedCharacters(storage: StoragePort): CharacterReference[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(CHARACTERS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value
      .filter((entry): entry is CharacterReference => {
        if (
          !entry ||
          typeof entry !== "object" ||
          !validId(entry.id) ||
          seen.has(entry.id)
        )
          return false;
        seen.add(entry.id);
        return true;
      })
      .map((entry) => ({
        id: entry.id,
        ...(typeof entry.name === "string" ? { name: entry.name } : {}),
        ...(typeof entry.portraitId === "string"
          ? { portraitId: entry.portraitId }
          : {}),
      }));
  } catch {
    return [];
  }
}
/** Merge on every write so two open tabs cannot replace each other's roster. */
export function rememberCharacter(
  storage: StoragePort,
  entry: CharacterReference,
) {
  if (!validId(entry.id)) return;
  const previous = savedCharacters(storage),
    old = previous.find((c) => c.id === entry.id);
  storage.setItem(
    CHARACTERS_KEY,
    JSON.stringify([
      { ...old, ...entry },
      ...previous.filter((c) => c.id !== entry.id),
    ]),
  );
}

export const MAX_CHARACTERS = 20;
export const HERO_LIMIT_MESSAGE = `Можно создать не больше ${MAX_CHARACTERS} героев. Удалите одного из старых героев, чтобы создать нового.`;
export function canCreateCharacter(storage: StoragePort) {
  return savedCharacters(storage).length < MAX_CHARACTERS;
}
export function forgetCharacter(storage: StoragePort, id: string) {
  storage.setItem(
    CHARACTERS_KEY,
    JSON.stringify(savedCharacters(storage).filter((hero) => hero.id !== id)),
  );
}
/** Serialize creation across tabs before checking the latest roster. */
export async function createSavedCharacter<T>(
  storage: StoragePort,
  create: () => Promise<T>,
  remember: (result: T) => void,
): Promise<T> {
  const run = async () => {
    if (!canCreateCharacter(storage)) throw new Error(HERO_LIMIT_MESSAGE);
    const result = await create();
    remember(result);
    return result;
  };
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("duelyant.create-character", run)
    : run();
}
