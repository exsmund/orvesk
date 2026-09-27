export const STAT_KEYS = [
  "strength",
  "agility",
  "vitality",
  "intelligence",
] as const;
export type Stat = (typeof STAT_KEYS)[number];
export type Stats = Record<Stat, number>;
export type DamageType = keyof typeof import("../../data/damage-types.json");
export type WeaponWeight =
  keyof typeof import("../../data/weapon-weights.json");
export type Slot = "weapon" | "shield" | "body" | "feet" | "ring" | "amulet";
export interface Item {
  /** Related constructions may intentionally share action geometry. */
  family?: string;
  /** Combat handling, independent of the number of occupied hands. */
  weightClass?: WeaponWeight;
  lore?: { source: string; section: string };
  templateId?: string;
  level?: number;
  figures: import("@/game/combat/figure-config").FigureDefinition[];
  unarmed?: boolean;
  charmEffect?: "unlock" | "compress";
  id: string;
  name: string;
  kind: "weapon" | "shield" | "armor" | "jewelry";
  slot: Slot;
  tier: number;
  ignoreBlocked?: boolean;
  requirements: Partial<Stats>;
  description: string;
  hands?: number;
  defense?: Partial<Record<DamageType, number>>;
}
export type BattleMode = "free" | "expendable";
export interface Fighter {
  deck?: {
    draw: Maneuver[];
    hand: Maneuver[];
    discard: Maneuver[];
    exchanged: boolean;
  };
  exhausted?: boolean;
  creatureId?: string;
  creatureVariant?: string;
  battleMode?: BattleMode;
  actionsFinished?: boolean;
  portraitId?: string;
  name: string;
  stats: Stats;
  hp: number;
  gear: Record<"weapon" | "shield" | "body" | "feet", string | null> &
    Partial<Record<"ring" | "amulet", string | null>>;
  skills?: Array<import("@/game/skills/skills").SkillId | null>;
  elite?: boolean;
  charmsUsed?: { ring: boolean; amulet: boolean };
  stamina?: number;
  style?: EnemyStyle;
}
export type EnemyStyle = "berserker" | "duelist" | "warden";
export interface TurnRecord {
  clash?: ClashResult;
  round: number;

  playerAction: string;
  enemyAction: string;
  events: string[];
}
export type RewardSelection = "souls" | "equip" | "learn";
export type Reward =
  | { kind: "souls"; amount: number }
  | { kind: "item"; itemId: string }
  | { kind: "skill"; skillId: import("@/game/skills/skills").SkillId };
export interface Game {
  journey?: Journey;
  souls: number;
  version: 5;
  clashPlan?: ClashPlan;
  lastReactor?: Side;
  player: Fighter;
  enemy: Fighter;
  round: number;
  fight: number;
  wins: number;
  log: TurnRecord[];
  phase: "combat" | "victory" | "defeat" | "draw" | "ready";
  reward: Reward | null;
  rewardOptions?: Reward[];
}
export type PublicGame = Omit<Game, "clashPlan"> & { clash?: PublicClashPlan };

export type Side = "player" | "enemy";
export type Cell = [number, number];
export interface Maneuver {
  naturalLevel?: boolean;
  category?: "attack" | "defense" | "support";
  copies?: number;
  staminaCost?: number;
  blockCost?: number;
  staminaDamagePerCell?: number;
  healthDamage?: {
    base: number;
    stats: Stat[];
    types: Partial<Record<DamageType, number>>;
  };
  counter?: boolean;
  blocks?: boolean;
  healing?: number;
  sourceLevel?: number;
  templateId?: string;
  /** Data-owned figure illustration and evasion. */
  art?: string;
  evades?: boolean;
  id: string;
  name: string;
  skillId?: import("@/game/skills/skills").SkillId;
  shape: Cell[];
  weaponId?: string;
  shieldId?: string;
  equipmentId?: string;
  description: string;
  ignoreBlocked?: boolean;
}
export interface Journey {
  map?: import("@/game/journey/journey-map").JourneyMapLayout;
  enemies?: Record<string, Fighter>;
  lostSouls?: { nodeId: string; amount: number };
  mapPreset?: string;
  awaitingFirstBattle?: boolean;
  path?: string[];
  forgeResolved?: boolean;
  battleMode?: BattleMode;
  startLevel: number;
  expedition: number;
  stage: number;
  cleared: number;
  route?: "camp" | "forge";
  offers?: string[];
  finished?: boolean;
}
export interface Placement {
  id: string;
  x: number;
  y: number;
  rotation: number;
}
export interface BoardModifiers {
  unlocked?: number;
  compressed?: string;
}
export interface ClashPlan {
  committedPlayerModifiers?: BoardModifiers;
  battleMode?: BattleMode;
  stage: "preparation" | "reaction" | "reveal";
  preparer: Side;
  reactor: Side;

  blocked: number[];

  playerPlaced: Placement[];
  enemyPlaced: Placement[];
  playerModifiers: BoardModifiers;
  enemyModifiers: BoardModifiers;
}
export type PublicClashPlan = Omit<
  ClashPlan,
  "enemyPlaced" | "enemyModifiers"
> & { enemyPlaced?: Placement[]; enemyModifiers?: BoardModifiers };
export interface ClashCell {
  index: number;
  player?: Maneuver;
  enemy?: Maneuver;
  playerDamage: number;
  enemyDamage: number;
  /** Absent in older saved turn results. */
  playerStaminaDamage?: number;
  enemyStaminaDamage?: number;
  interaction:
    | "evaded"
    | "empty"
    | "attack"
    | "blocked"
    | "clash"
    | "guard"
    | "pressure"
    | "utility";
}
export interface ClashResult {
  battleMode?: BattleMode;
  summary?: Record<Side, import("@/game/combat/clash-damage").ClashSideSummary>;
  preparer: Side;
  reactor: Side;

  blocked: number[];
  playerPlaced: Placement[];
  enemyPlaced: Placement[];
  playerModifiers: BoardModifiers;
  enemyModifiers: BoardModifiers;
  cells: ClashCell[];
  playerDamage: number;
  enemyDamage: number;
  playerStaminaLoss: number;
  enemyStaminaLoss: number;
}
