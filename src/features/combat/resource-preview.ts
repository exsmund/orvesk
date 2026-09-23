export interface ResourceChange {
  health: number;
  poise: number;
}
export interface CombatResourcePreview {
  key: string;
  player: ResourceChange;
  enemy: ResourceChange;
}
