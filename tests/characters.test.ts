import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTERS_KEY,
  savedCharacters,
  rememberCharacter,
  forgetCharacter,
  canCreateCharacter,
  createSavedCharacter,
  HERO_LIMIT_MESSAGE,
} from "../src/features/characters/characters";
const first = "6498eb04-c68a-45d1-89a2-72e0c441ef9e",
  second = "7498eb04-c68a-45d1-89a2-72e0c441ef9e";
function storage(initial = "[]") {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (key: string, next: string) => {
      assert.equal(key, CHARACTERS_KEY);
      value = next;
    },
  };
}
test("repeated play deduplicates the registry and preserves metadata", () => {
  const s = storage();
  rememberCharacter(s, {
    id: first,
    name: "Первый",
    portraitId: "portrait-01",
  });
  rememberCharacter(s, { id: first });
  assert.deepEqual(savedCharacters(s), [
    { id: first, name: "Первый", portraitId: "portrait-01" },
  ]);
});
test("new characters and writes from other tabs preserve every known character", () => {
  const s = storage();
  rememberCharacter(s, { id: first, name: "Первый" });
  rememberCharacter(s, { id: second, name: "Второй" });
  rememberCharacter(s, { id: first, name: "Обновлённый" });
  assert.deepEqual(savedCharacters(s), [
    { id: first, name: "Обновлённый" },
    { id: second, name: "Второй" },
  ]);
});
test("damaged local registry and invalid IDs do not break loading or become API paths", () => {
  for (const invalid of ["broken", "null", "{}"])
    assert.deepEqual(savedCharacters(storage(invalid)), []);
  const s = storage(
    JSON.stringify([
      { id: "../../private" },
      null,
      { id: first },
      { id: first },
      { id: second, name: 12 },
    ]),
  );
  assert.deepEqual(savedCharacters(s), [{ id: first }, { id: second }]);
  rememberCharacter(s, { id: "bad" });
  assert.equal(savedCharacters(s).length, 2);
});

test("deletion removes only the selected hero and frees a slot at the limit", () => {
  const s = storage();
  for (let i = 0; i < 20; i++)
    rememberCharacter(s, {
      id: `${String(i).padStart(8, "0")}-c68a-45d1-89a2-72e0c441ef9e`,
    });
  assert.equal(canCreateCharacter(s), false);
  const before = savedCharacters(s);
  forgetCharacter(s, before[7].id);
  assert.deepEqual(
    savedCharacters(s),
    before.filter((_, i) => i !== 7),
  );
  assert.equal(canCreateCharacter(s), true);
});
test("creation at capacity never calls the server and succeeds after deletion", async () => {
  const s = storage();
  for (let i = 0; i < 20; i++)
    rememberCharacter(s, {
      id: `${String(i).padStart(8, "0")}-c68a-45d1-89a2-72e0c441ef9e`,
    });
  let calls = 0;
  const create = async () => {
    calls++;
    return { id: first };
  };
  await assert.rejects(
    createSavedCharacter(s, create, (r) => rememberCharacter(s, r)),
    { message: HERO_LIMIT_MESSAGE },
  );
  assert.equal(calls, 0);
  forgetCharacter(s, savedCharacters(s)[0].id);
  await createSavedCharacter(s, create, (r) => rememberCharacter(s, r));
  assert.equal(calls, 1);
  assert.equal(savedCharacters(s).length, 20);
});
