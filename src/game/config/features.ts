/** Shared client/server flags. Restart the server after changing a flag. */
export const FEATURE_FLAGS = {
  combatEquipmentSwap: false,
};

export function isCombatActionEnabled(action: string): boolean {
  return action !== "equip" || FEATURE_FLAGS.combatEquipmentSwap;
}
