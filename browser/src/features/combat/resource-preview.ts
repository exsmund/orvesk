export interface ResourceChange {
  available?: number;
  health: number;
  stamina: number;
}
export interface CombatResourcePreview {
  key: string;
  player: ResourceChange;
  enemy: ResourceChange;
}
