import type { PublicGame } from "../types";

export function turnFeedback(before: PublicGame, after: PublicGame) {
  const turn = after.log[0];
  if (
    after.fight !== before.fight ||
    after.round !== before.round + 1 ||
    turn?.round !== before.round
  )
    return null;
  // Display health actually lost, including armor, ripostes and lethal overkill.
  const lost = (oldHp: number, hp: number) =>
    Math.max(0, Math.round((oldHp - Math.max(0, hp)) * 10) / 10);
  return {
    id: `${after.fight}:${turn.round}`,
    player: lost(before.player.hp, after.player.hp),
    enemy: lost(before.enemy.hp, after.enemy.hp),
  };
}

export const formatDamage = (amount: number) =>
  amount.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
