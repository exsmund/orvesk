import { ResourceBarDemo } from "./ResourceBarDemo";
import { portrait } from "../src/game/characters/portraits";
import { CharacterPortrait } from "../src/shared/ui/CharacterPortrait";
import { GameMenu } from "../src/shared/ui/GameMenu";
import { CombatBackdrop } from "../src/features/combat/CombatBackdrop";
import { BattleModeDialog } from "../src/features/combat/BattleModeDialog";
import { BattleResultDialog } from "../src/features/combat/BattleResultDialog";
import { CharacterCreation } from "../src/features/characters/CharacterCreation";
import { CharacterHome } from "../src/features/characters/CharacterHome";
import { CharacterStats } from "../src/features/characters/CharacterStats";
import { FighterDebuffs } from "../src/features/characters/FighterDebuffs";
import { FighterPanel } from "../src/features/characters/FighterPanel";
import { SoulBalance } from "../src/features/characters/SoulBalance";
import { ActionSource } from "../src/features/combat/ActionFigures";
import { ActionFigure } from "../src/features/combat/ActionFigures";
import { ActionPalette } from "../src/features/combat/ActionFigures";
import { FloatingDamage } from "../src/features/combat/BattleEffects";
import { ComboLinks } from "../src/features/combat/CombatForecast";
import { ComboNotes } from "../src/features/combat/CombatForecast";
import { CombatForecast } from "../src/features/combat/CombatForecast";
import { CombatMenu } from "../src/features/combat/CombatMenu";
import { CombatReplay } from "../src/features/combat/CombatReplay";
import { ReactionBoard } from "../src/features/combat/ReactionBoard";
import { ClashOutcome } from "../src/features/combat/ReactionBoard";
import { RockTerrain } from "../src/features/combat/RockTerrain";
import { Resources } from "../src/features/combat/TacticalHUD";
import { ItemArtwork } from "../src/features/equipment/EquipmentDoll";
import { EquipmentDoll } from "../src/features/equipment/EquipmentDoll";
import { ItemInspection } from "../src/features/equipment/ItemInspection";
import { ItemInspectionWindow } from "../src/features/equipment/ItemInspectionWindow";
import { StartScreen } from "../src/features/home/StartScreen";
import { SpecialMark } from "../src/features/journey/AdventureUI";
import { BattleModeInfo } from "../src/features/journey/AdventureUI";
import { JourneyChoices } from "../src/features/journey/AdventureUI";
import { JourneyStop } from "../src/features/journey/AdventureUI";
import { JourneyMap } from "../src/features/journey/JourneyMap";
import { JourneyScreen } from "../src/features/journey/JourneyScreen";
import { VictoryRewardDialog } from "../src/features/rewards/VictoryRewardDialog";
import { SkillIcon } from "../src/features/skills/SkillIcon";
import { SkillCard } from "../src/features/skills/SkillUI";
import { FighterSkills } from "../src/features/skills/SkillUI";
import { GothicIcon } from "../src/shared/ui/GothicIcon";
import { GothicTextButton } from "../src/shared/ui/GothicTextButton";
import { Modal } from "../src/shared/ui/Modal";
import { ModalFooter } from "../src/shared/ui/ModalFooter";

import { useState, type ReactNode } from "react";
import { upgradeAttribute, level } from "../src/game/progression/souls";
import {
  game,
  pub,
  fighter,
  mapGame,
  outcome,
  replay,
  storage,
  load,
  noop,
  battle,
} from "./fixtures";
import { item } from "../src/game/equipment/catalog";
import { reactionManeuvers } from "../src/game/combat/reaction-rules";
import { calculateClash } from "../src/game/combat/clash-damage";
import { publicClash, submitClash } from "../src/game/combat/reaction-engine";
import { chooseJourneyStep } from "../src/game/journey/journey";
import type { Game, Placement, BoardModifiers } from "../src/game/types";
const token = reactionManeuvers(fighter)[0];
const combo = {
  kind: "counter" as const,
  name: "Ответ из-за щита",
  actionIds: ["strike-1", "guard"],
  links: [[0, 1] as [number, number]],
  damageBonus: 1,
  cells: [0, 1],
  poiseBonus: 0,
  recoveryBonus: 0,
};
const forecast = calculateClash(
  { player: fighter, enemy: game.enemy },
  { player: [{ id: token.id, x: 0, y: 0, rotation: 0 }], enemy: [] },
  { player: {}, enemy: {} },
);
function ModalHeaderDemo({ close }: { close: () => void }) {
  const [back, setBack] = useState(false);
  return (
    <Modal
      title={back ? "Создание персонажа" : "Характеристики"}
      onBack={back ? undefined : () => setBack(true)}
      close={close}
    >
      <p style={{ padding: 24 }}>
        Заголовок в окружении игровой модалки: общая рамка, текстуры и
        адаптивные размеры.
      </p>
    </Modal>
  );
}
function Launch({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, set] = useState(false);
  return (
    <>
      <button className="sb-launch" onClick={() => set(true)}>
        Открыть пример
      </button>
      {open && children(() => set(false))}
    </>
  );
}
function PaletteDemo() {
  const [selected, set] = useState(token.id),
    [rotation, rotate] = useState(0);
  return (
    <ActionPalette
      tokens={reactionManeuvers(fighter)}
      selected={selected}
      rotation={rotation}
      mod={{}}
      placed={[]}
      busy={false}
      fighter={fighter}
      onSelect={(id) => {
        set(id);
        rotate((rotation + 1) % 4);
      }}
      onScale={noop}
    />
  );
}
function StatsDemo() {
  const [hero, set] = useState(structuredClone(fighter)),
    [souls, pay] = useState(12);
  return (
    <CharacterStats
      fighter={hero}
      souls={souls}
      onUpgrade={(stat) => {
        pay((s) => s - (level(hero) + 2));
        set({
          ...hero,
          stats: { ...hero.stats, [stat]: hero.stats[stat] + 1 },
        });
      }}
    />
  );
}
function RewardDemo() {
  const [g, set] = useState(() => {
      const g = battle();
      g.phase = "victory";
      g.reward = { kind: "souls", amount: 2 };
      g.rewardOptions = [
        g.reward,
        { kind: "skill", skillId: "dodge" },
        { kind: "item", itemId: "axe" },
      ];
      g.player.skills = [];
      return g;
    }),
    [index, select] = useState(0),
    [done, finish] = useState(false);
  return done ? (
    <p role="status">
      Награда выбрана в демонстрации. Перезапустите пример, чтобы повторить.
    </p>
  ) : (
    <VictoryRewardDialog
      game={publicClash(g)}
      busy={false}
      index={index}
      onSelect={select}
      onClaim={() => finish(true)}
      onSpend={(stat) =>
        set(upgradeAttribute(g, stat, level(g.player), g.souls))
      }
    />
  );
}
function BoardDemo() {
  const [g, set] = useState(battle),
    [message, tell] = useState("");
  return (
    <div className="sb-board">
      <p role="status">{message}</p>
      <ReactionBoard
        key={`${g.round}-${g.clashPlan?.stage}`}
        game={publicClash(g)}
        session="storybook-only"
        busy={false}
        onInspect={(id) => tell(item(id).name)}
        onSubmit={async (payload) => {
          const p = payload as {
            placements: Placement[];
            modifiers: BoardModifiers;
          };
          try {
            set(submitClash(g, p.placements, p.modifiers, () => 0.5));
          } catch (e) {
            tell(String(e));
          }
        }}
      />
    </div>
  );
}
function JourneyDemo({ screen = false }: { screen?: boolean }) {
  const [g, set] = useState(() => structuredClone(mapGame)),
    [message, tell] = useState("");
  const visit = (payload: object) => {
    try {
      const next = chooseJourneyStep(g as Game, payload, () => 0.5);
      if (next.phase === "combat") tell("Бой начат в демонстрации");
      set(publicClash(next));
    } catch (e) {
      tell(String(e));
    }
  };
  return (
    <>
      <p role="status">{message}</p>
      {screen ? (
        <JourneyScreen
          game={g}
          busy={false}
          onNext={visit}
          onInspect={noop}
          onHome={() => tell("Главный экран")}
          onHero={() => tell("Карточка героя")}
          onCatalog={() => tell("Арсенал")}
          onRules={() => tell("Правила")}
        />
      ) : (
        <JourneyMap
          game={g}
          onVisit={(nodeId) =>
            visit({ nodeId, fromNode: g.journey!.path!.at(-1) })
          }
        />
      )}
    </>
  );
}
function ReplayDemo() {
  const [count, set] = useState(0);
  return (
    <CombatReplay
      turn={replay}
      count={count}
      onCount={set}
      onDone={noop}
      reduced
      active
      ending="Завершить"
    />
  );
}
export function Example({ name }: { name: string }) {
  switch (name) {
    case "CombatBackdrop":
      return (
        <div
          style={{
            position: "relative",
            isolation: "isolate",
            height: 360,
            transform: "translateZ(0)",
            overflow: "hidden",
          }}
        >
          <CombatBackdrop journey={{ mapPreset: "forest" }} />
        </div>
      );
    case "CharacterPortrait":
      return (
        <div style={{ width: 160 }}>
          <CharacterPortrait
            src={portrait(fighter.portraitId).src}
            alt={`Портрет: ${fighter.name}`}
          />
        </div>
      );
    case "GothicIcon":
      return (
        <div className="sb-row">
          {(
            [
              "menu",
              "left",
              "right",
              "close",
              "plus",
              "minus",
              "grave",
            ] as const
          ).map((icon) => (
            <button key={icon} className="gothic-button" aria-label={icon}>
              <GothicIcon icon={icon} />
            </button>
          ))}
        </div>
      );
    case "GothicTextButton":
      return (
        <div className="sb-row">
          <GothicTextButton>Продолжить приключение</GothicTextButton>
          <GothicTextButton disabled>Недоступно</GothicTextButton>
          <GothicTextButton style={{ width: 180 }}>
            Очень длинная подпись автоматически уменьшается
          </GothicTextButton>
        </div>
      );
    case "ResourceBar":
      return <ResourceBarDemo />;
    case "Modal":
      return (
        <Launch>
          {(close) => (
            <Modal title="Пример модального окна" close={close} size="small">
              <p style={{ padding: 24 }}>Содержимое модального окна</p>
              <ModalFooter hint="Подсказка над кнопкой">
                <GothicTextButton onClick={close}>Готово</GothicTextButton>
              </ModalFooter>
            </Modal>
          )}
        </Launch>
      );
    case "ModalHeader":
      return <Launch>{(close) => <ModalHeaderDemo close={close} />}</Launch>;
    case "ModalFooter":
      return (
        <div className="sb-stage">
          <ModalFooter hint="Распределите оставшиеся: 3">
            <GothicTextButton>Продолжить</GothicTextButton>
            <GothicTextButton>Отмена</GothicTextButton>
          </ModalFooter>
        </div>
      );
    case "SoulBalance":
      return (
        <div className="sb-row">
          {[0, 3, 125, 10000].map((amount) => (
            <SoulBalance key={amount} amount={amount} />
          ))}
        </div>
      );
    case "CharacterCreation":
      return (
        <Launch>
          {(close) => <CharacterCreation onClose={close} onCreate={close} />}
        </Launch>
      );
    case "CharacterHome":
      return (
        <Launch>
          {(close) => (
            <CharacterHome
              onDelete={async () => {}}
              load={load}
              storage={storage}
              onBack={close}
              onCreate={close}
              onOpen={close}
            />
          )}
        </Launch>
      );
    case "StartScreen":
      return (
        <StartScreen
          load={load}
          storage={storage}
          onContinue={noop}
          onCreate={noop}
          onHeroes={noop}
        />
      );
    case "CharacterStats":
      return <StatsDemo />;
    case "FighterDebuffs":
      return (
        <FighterDebuffs
          fighter={{
            ...fighter,
            offBalance: true,
            frostImmune: true,
            prone: true,
          }}
        />
      );
    case "FighterPanel":
      return <FighterPanel fighter={fighter} souls={12} onInspect={noop} />;
    case "EquipmentDoll":
      return (
        <div style={{ maxWidth: 400 }}>
          <EquipmentDoll fighter={fighter} onInspect={noop} />
        </div>
      );
    case "ItemArtwork":
      return (
        <div className="sb-row">
          {["fist", "dagger", "buckler", "axe"].map((id) => (
            <ItemArtwork key={id} equipment={item(id)} size={120} />
          ))}
        </div>
      );
    case "ItemInspection":
      return (
        <ItemInspection
          equipment={item("axe")}
          player={fighter}
          source="Награда"
        />
      );
    case "ItemInspectionWindow":
      return (
        <Launch>
          {(close) => (
            <ItemInspectionWindow
              equipment={item("axe")}
              player={fighter}
              close={close}
            />
          )}
        </Launch>
      );
    case "SkillIcon":
      return (
        <div style={{ width: 96 }}>
          <SkillIcon id="dodge" />
        </div>
      );
    case "SkillCard":
      return <SkillCard id="dodge" fighter={fighter} />;
    case "FighterSkills":
      return <FighterSkills fighter={fighter} />;
    case "ActionSource":
      return <ActionSource m={token} />;
    case "ActionFigure":
      return (
        <div
          style={
            {
              "--piece-cell": "48px",
              "--piece-gap": "4px",
            } as React.CSSProperties
          }
        >
          <ActionFigure
            m={
              reactionManeuvers(fighter).find((m) => m.shape.length > 1) ??
              token
            }
            damage={3}
          />
        </div>
      );
    case "ActionPalette":
      return <PaletteDemo />;
    case "ReactionBoard":
      return <BoardDemo />;
    case "BattleModeDialog":
      return (
        <Launch>
          {(close) => <BattleModeDialog mode="expendable" onContinue={close} />}
        </Launch>
      );
    case "BattleResultDialog":
      return (
        <Launch>
          {(close) => (
            <BattleResultDialog
              game={{ ...mapGame, phase: "victory", log: [outcome] }}
              onClose={close}
            />
          )}
        </Launch>
      );
    case "ClashOutcome":
      return <ClashOutcome turn={outcome} onDone={noop} ending="Далее" />;
    case "CombatReplay":
      return <ReplayDemo />;
    case "Resources":
      return <Resources fighter={fighter} />;
    case "FloatingDamage":
      return (
        <div style={{ position: "relative", height: 160 }}>
          <FloatingDamage amount={4} />
        </div>
      );
    case "RockTerrain":
      return (
        <div
          className="terrain-board"
          style={{ position: "relative", width: 300, height: 300 }}
        >
          <RockTerrain blocked={[0, 1, 4]} />
        </div>
      );
    case "ComboLinks":
      return (
        <div style={{ position: "relative", width: 300, height: 300 }}>
          <ComboLinks combos={{ player: [combo] }} />
        </div>
      );
    case "ComboNotes":
      return (
        <ComboNotes
          sides={{
            ...forecast.sides,
            player: { ...forecast.sides.player, combos: [combo] },
          }}
        />
      );
    case "CombatForecast":
      return (
        <CombatForecast
          forecast={forecast}
          baseline={null}
          hovering={false}
          pending={[]}
        />
      );
    case "GameMenu":
      return (
        <Launch>
          {(close) => (
            <GameMenu
              busy={false}
              onClose={close}
              onHome={close}
              onCatalog={close}
              onRules={close}
              onMap={close}
              onJournal={close}
            />
          )}
        </Launch>
      );
    case "CombatMenu":
      return (
        <div className="sb-stage">
          <CombatMenu
            busy={false}
            onHome={noop}
            onMap={noop}
            onCatalog={noop}
            onRules={noop}
            onJournal={noop}
          />
        </div>
      );
    case "SpecialMark":
      return (
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <SpecialMark special={{ kind: "rally", index: 0 }} index={0} />
        </div>
      );
    case "BattleModeInfo":
      return <BattleModeInfo game={pub} />;
    case "JourneyMap":
      return <JourneyDemo />;
    case "JourneyScreen":
      return <JourneyDemo screen />;
    case "JourneyChoices":
      return (
        <JourneyChoices
          game={mapGame}
          busy={false}
          onNext={noop}
          onInspect={noop}
        />
      );
    case "JourneyStop":
      return (
        <JourneyStop
          game={{
            ...mapGame,
            journey: {
              ...mapGame.journey!,
              path: ["fight-1", "forge-1"],
              offers: ["axe", "buckler"],
              forgeResolved: false,
            },
          }}
          busy={false}
          onNext={noop}
          onInspect={noop}
        />
      );
    case "VictoryRewardDialog":
      return <Launch>{() => <RewardDemo />}</Launch>;
    default:
      throw new Error(`Не настроен пример для ${name}`);
  }
}
