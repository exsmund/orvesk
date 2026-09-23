export const STAT_KEYS = [
  "strength",
  "agility",
  "endurance",
  "intelligence",
  "reaction",
] as const;
export type Stat = (typeof STAT_KEYS)[number];
export type Stats = Record<Stat, number>;
export type DamageType =
  "pierce" | "slash" | "blunt" | "frost" | "fire" | "wind" | "magic";
export type Slot = "weapon" | "shield" | "body" | "feet" | "ring" | "amulet";
export interface Damage {
  type: DamageType;
  stat: Stat;
  scale: number;
  base: number;
}
export interface Item {
  id: string;
  name: string;
  kind: "weapon" | "shield" | "armor" | "jewelry";
  slot: Slot;
  tier: number;
  ignoreBlocked?: boolean;
  requirements: Partial<Stats>;
  description: string;
  hands?: number;
  range?: number;
  damage?: Damage[];
  defense?: Partial<Record<DamageType, number>>;
  resistance?: Partial<Record<DamageType, number>>;
  kickBonus?: number;
  /** Poise restored per entire enemy attack covered by this shield’s blocks. */
  fullBlockPoiseRecovery?: number;
}
export type BattleMode = "limited" | "free" | "expendable";
export interface Fighter {
  battleMode?: BattleMode;
  spentFigures?: string[];
  actionsFinished?: boolean;
  /** Optional for saves created before portrait selection was introduced. */
  portraitId?: string;
  name: string;
  stats: Stats;
  hp: number;
  gear: Record<"weapon" | "shield" | "body" | "feet", string | null> &
    Partial<Record<"ring" | "amulet", string | null>>;
  offBalance: boolean;
  prone: boolean;
  skills?: Array<import("./skills/skills").SkillId | null>;
  splitBuckler?: boolean;
  tactical?: boolean;
  frostImmune?: boolean;
  chilled?: boolean;
  cooldowns?: Record<string, number>;
  archetype?: "warden" | "duelist" | "crusher" | "ghost";
  elite?: boolean;
  charmsUsed?: { ring: boolean; amulet: boolean };
  stamina?: number;
  poise?: number;
  exposed?: number;
  style?: EnemyStyle;
}
export type Action =
  "attack" | "heavy" | "block" | "parry" | "kick" | "equip" | "shield" | "rest";
export interface Choice {
  action: Action;
  step: -1 | 0 | 1;
  itemId?: string;
  useFist?: boolean;
}
export type EnemyStyle = "berserker" | "duelist" | "warden";
export type EnemyTell =
  "windup" | "guard" | "advance" | "retreat" | "pressure" | "recover" | "reach";
export interface TurnRecord {
  clash?: ClashResult;
  replay?: CombatReplay;
  reaction?: boolean;
  round: number;
  playerDie: number;
  enemyDie: number;
  playerAction: string;
  enemyAction: string;
  events: string[];
  playerMove?: Action;
  enemyMove?: Action;
}
export type RewardSelection = "souls" | "equip" | "learn";
export type Reward =
  | { kind: "souls"; amount: number }
  | { kind: "item"; itemId: string }
  | { kind: "skill"; skillId: import("./skills/skills").SkillId };
export interface Game {
  journey?: Journey;
  souls: number;
  version: 1 | 2 | 3 | 4;
  clashPlan?: ClashPlan;
  lastReactor?: Side;
  roundPlan?: RoundPlan;
  lastFirst?: Side;
  player: Fighter;
  enemy: Fighter;
  round: number;
  fight: number;
  wins: number;
  distance: number;
  ground: string[];
  log: TurnRecord[];
  phase: "combat" | "victory" | "defeat" | "draw" | "ready";
  reward: Reward | null;
  rewardOptions?: Reward[];
  enemyIntent: Choice;
  enemyTell?: EnemyTell;
}
export type PublicGame = Omit<
  Game,
  "enemyIntent" | "roundPlan" | "clashPlan"
> & { planning?: PublicRoundPlan; clash?: PublicClashPlan };

export type Side = "player" | "enemy";
export type Cell = [number, number];
export interface Maneuver {
  spent?: boolean;
  id: string;
  name: string;
  skillId?: import("./skills/skills").SkillId;
  action: Action | "advance" | "retreat" | "stand" | "skill";
  shape: Cell[];
  weaponId?: string;
  shieldId?: string;
  guardHits?: number;
  description: string;
  ignoreBlocked?: boolean;
  cellWeights?: number[];
  cooldownKey?: string;
  cooldown?: number;
  choiceGroup?: string;
  poiseDamage?: number;
  powerScale?: number;
}
export type SpecialCell = { index: number; kind: "pierce" | "rally" | "surge" };
export interface Journey {
  /** Persisted event placement; absent only in pre-generator saves. */
  map?: import("./journey/journey-map").JourneyMapLayout;
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
  route?: "camp" | "forge" | "risk";
  offers?: string[];
  finished?: boolean;
}
export interface Placement {
  id: string;
  x: number;
  y: number;
  rotation: number;
  itemId?: string;
}
export interface BoardModifiers {
  unlocked?: number;
  compressed?: string;
}
export interface RoundPlan {
  stage: "placement" | "ordering";
  blocked: number[];
  enemyBlocked: number[];
  enemyPlaced: Placement[];
  enemyOrder: string[];
  playerPlaced: Placement[];
  modifiers: BoardModifiers;
  enemyModifiers: BoardModifiers;
}
export interface PublicRoundPlan {
  stage: "placement" | "ordering";
  blocked: number[];
  placed: Placement[];
  modifiers: BoardModifiers;
  enemyActions?: { id: string; name: string; description: string }[];
}

/** Resolved, public facts only. No pending plans or future enemy decisions. */
export interface CombatSnapshot {
  player: Pick<
    Fighter,
    "hp" | "poise" | "prone" | "offBalance" | "exposed" | "gear"
  >;
  enemy: Pick<
    Fighter,
    "hp" | "poise" | "prone" | "offBalance" | "exposed" | "gear"
  >;
  distance: number;
}
export interface CombatStep {
  actor: Side;
  action: Maneuver["action"];
  name: string;
  itemId?: string;
  defense?: {
    kind: "block" | "parry";
    itemId: string;
    hits: number;
    bypassed?: boolean;
  };
  result: string;
  damage?: number;
  dice?: { attack: number; defense: number };
  counter?: boolean;
  events: string[];
  after: CombatSnapshot;
}
export interface CombatReplay {
  first: Side;
  playerInitiative: number;
  enemyInitiative: number;
  initial: CombatSnapshot;
  steps: CombatStep[];
}

export interface ClashPlan {
  committedPlayerModifiers?: BoardModifiers;
  battleMode?: BattleMode;
  special?: SpecialCell;
  stage: "preparation" | "reaction";
  preparer: Side;
  reactor: Side;
  playerDie: number;
  enemyDie: number;
  blocked: number[];
  playerBudget: number;
  enemyBudget: number;
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
  summary?: Record<Side, import("./combat/clash-damage").ClashSideSummary>;
  special?: SpecialCell;
  preparer: Side;
  reactor: Side;
  playerDie: number;
  enemyDie: number;
  playerReaction: number;
  enemyReaction: number;
  playerBudget?: number;
  enemyBudget?: number;
  blocked: number[];
  playerPlaced: Placement[];
  enemyPlaced: Placement[];
  playerModifiers: BoardModifiers;
  enemyModifiers: BoardModifiers;
  cells: ClashCell[];
  playerDamage: number;
  enemyDamage: number;
  playerPoiseLoss: number;
  enemyPoiseLoss: number;
}
