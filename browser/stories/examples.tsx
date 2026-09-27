import { Popup } from "@/shared/ui/Popup";
import { CellPopup } from "@/features/combat/CellPopup";
import { CreatureDetails } from "@/features/creatures/CreatureDetails";
import { ModalHeader } from "@/shared/ui/Modal/ModalHeader";
import { RewardArt } from "@/features/rewards/VictoryRewardDialog/RewardArt";
import { RewardWindow } from "@/features/rewards/VictoryRewardDialog/RewardWindow";
import { MapWindow } from "@/features/journey/JourneyScreen/MapWindow";
import { NodeDialog } from "@/features/journey/JourneyMap/NodeDialog";

import { LayerIcon } from "@/features/combat/ReactionBoard/LayerIcon";
import { Delta } from "@/features/equipment/ItemInspection/Delta";
import { ItemCard } from "@/features/equipment/ItemInspection/ItemCard";
import { App } from "@/app/App/App";
import { Text } from "@/shared/ui/Text";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { JourneyNodeIcon } from "@/features/journey/JourneyNodeIcon/JourneyNodeIcon";
import { CharacterCard } from "@/features/characters/CharacterCard/CharacterCard";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";
import { BattleModeArtwork } from "@/features/combat/BattleModeArtwork/BattleModeArtwork";
import { Mark } from "@/shared/ui/Mark/Mark";

import { Rules } from "@/features/rules/Rules/Rules";
import { ItemDetails } from "@/features/equipment/ItemDetails/ItemDetails";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { FighterDialog } from "@/features/characters/FighterDialog/FighterDialog";
import { GameScreen } from "@/features/combat/GameScreen/GameScreen";
import { Notification } from "@/shared/ui/Notification";
import { ResourceBarDemo } from "./ResourceBarDemo";
import { portrait } from "@/game/characters/portraits";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { GameMenu } from "@/shared/ui/GameMenu/GameMenu";
import { GameMenuOptions } from "@/shared/ui/GameMenuOptions/GameMenuOptions";
import { CombatBackdrop } from "@/features/combat/CombatBackdrop/CombatBackdrop";
import { BattleModeDialog } from "@/features/combat/BattleModeDialog/BattleModeDialog";
import { BattleResultDialog } from "@/features/combat/BattleResultDialog/BattleResultDialog";
import { CharacterCreation } from "@/features/characters/CharacterCreation/CharacterCreation";
import { CharacterHome } from "@/features/characters/CharacterHome/CharacterHome";
import { CharacterStats } from "@/features/characters/CharacterStats/CharacterStats";
import { FighterDebuffs } from "@/features/characters/FighterDebuffs/FighterDebuffs";
import { FighterPanel } from "@/features/characters/FighterPanel/FighterPanel";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import { ActionSource } from "@/features/combat/ActionSource/ActionSource";
import { ActionFigure } from "@/features/combat/ActionFigure/ActionFigure";
import { CellDamage } from "@/features/combat/CellDamage";
import { FigureCard } from "@/features/combat/FigureCard";
import { ActionPalette } from "@/features/combat/ActionPalette/ActionPalette";
import { FloatingDamage } from "@/features/combat/FloatingDamage/FloatingDamage";
import { CombatMenu } from "@/features/combat/CombatMenu/CombatMenu";

import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import { ClashOutcome } from "@/features/combat/ClashOutcome/ClashOutcome";
import { RockTerrain } from "@/features/combat/RockTerrain/RockTerrain";
import { Resources } from "@/features/combat/Resources/Resources";
import { EquipmentDoll } from "@/features/equipment/EquipmentDoll/EquipmentDoll";
import { ItemInspection } from "@/features/equipment/ItemInspection/ItemInspection";
import { ItemInspectionWindow } from "@/features/equipment/ItemInspectionWindow/ItemInspectionWindow";
import { StartScreen } from "@/features/home/StartScreen/StartScreen";
import { BattleModeInfo } from "@/features/journey/BattleModeInfo/BattleModeInfo";
import { JourneyChoices } from "@/features/journey/JourneyChoices/JourneyChoices";
import { JourneyStop } from "@/features/journey/JourneyStop/JourneyStop";
import { JourneyMap } from "@/features/journey/JourneyMap/JourneyMap";
import { JourneyScreen } from "@/features/journey/JourneyScreen/JourneyScreen";
import { VictoryRewardDialog } from "@/features/rewards/VictoryRewardDialog/VictoryRewardDialog";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";
import { SkillCard } from "@/features/skills/SkillCard/SkillCard";
import { FighterSkills } from "@/features/skills/FighterSkills/FighterSkills";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";

import { useState, type ReactNode } from "react";
import { upgradeAttribute, level } from "@/game/progression/souls";
import {
  game,
  pub,
  fighter,
  mapGame,
  outcome,
  storage,
  load,
  noop,
  battle,
} from "./fixtures";
import { item } from "@/game/equipment/catalog";
import { reactionManeuvers, itemManeuvers } from "@/game/combat/reaction-rules";
import {
  publicClash,
  submitClash,
  exchangeCard,
} from "@/game/combat/reaction-engine";
import { chooseJourneyStep } from "@/game/journey/journey";
import type { Game, Placement, BoardModifiers } from "@/game/types";
const token = reactionManeuvers(fighter)[0];
function PopupDemo({
  name,
  args,
}: {
  name: string;
  args: Record<string, unknown>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div style={{ paddingTop: 240 }}>
      <button
        className="sb-launch"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Открыть попап
      </button>
      {anchor &&
        (name === "Popup" ? (
          <Popup anchor={anchor} {...args} onClose={() => setAnchor(null)}>
            <Text>
              {String(args.children ?? "Компактный попап рядом с триггером")}
            </Text>
          </Popup>
        ) : (
          <CellPopup
            anchor={anchor}
            player={token}
            enemy={reactionManeuvers(game.enemy)[0]}
            {...args}
            onClose={() => setAnchor(null)}
          />
        ))}
    </div>
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
function PaletteDemo({ args = {} }: { args?: Record<string, unknown> }) {
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
      {...args}
    />
  );
}
function StatsDemo({ args = {} }: { args?: Record<string, unknown> }) {
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
      {...args}
    />
  );
}
function RewardDemo({ args = {} }: { args?: Record<string, unknown> }) {
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
      {...args}
    />
  );
}
function BoardDemo({ args = {} }: { args?: Record<string, unknown> }) {
  const [g, set] = useState(battle),
    [message, tell] = useState("");
  return (
    <div className="sb-board">
      <p role="status">{message}</p>
      <ReactionBoard
        key={`${g.round}-${g.clashPlan?.stage}`}
        game={publicClash(g)}
        onExchange={async (id) => set(exchangeCard(g, id))}
        session="storybook-only"
        busy={false}
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
        {...args}
      />
    </div>
  );
}
function JourneyDemo({
  screen = false,
  args = {},
}: {
  screen?: boolean;
  args?: Record<string, unknown>;
}) {
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
          onRules={() => tell("Правила")}
          {...args}
        />
      ) : (
        <JourneyMap
          game={g}
          onVisit={(nodeId) =>
            visit({ nodeId, fromNode: g.journey!.path!.at(-1) })
          }
          {...args}
        />
      )}
    </>
  );
}

export function Example({
  name,
  args = {},
}: {
  name: string;
  args?: Record<string, unknown>;
}) {
  switch (name) {
    case "RewardArt":
      return <RewardArt reward={{ kind: "souls", amount: 3 }} {...args} />;
    case "RewardWindow":
      return (
        <RewardWindow title="Награда" {...args}>
          {args.children !== undefined ? (
            (args.children as ReactNode)
          ) : (
            <>
              <Text {...args}>
                {args.children !== undefined ? (
                  (args.children as ReactNode)
                ) : (
                  <>Выберите награду</>
                )}
              </Text>
            </>
          )}
        </RewardWindow>
      );
    case "MapWindow":
      return (
        <MapWindow title="Остановка" close={noop} {...args}>
          {args.children !== undefined ? (
            (args.children as ReactNode)
          ) : (
            <>
              <Text {...args}>
                {args.children !== undefined ? (
                  (args.children as ReactNode)
                ) : (
                  <>Содержимое окна</>
                )}
              </Text>
            </>
          )}
        </MapWindow>
      );
    case "NodeDialog":
      return (
        <NodeDialog
          node={{
            id: "camp",
            kind: "camp",
            stage: 1,
            name: "Костёр",
            x: 50,
            y: 50,
          }}
          status="Можно идти"
          canVisit
          busy={false}
          onClose={noop}
          onConfirm={noop}
          {...args}
        />
      );

    case "LayerIcon":
      return <LayerIcon m={token} side="player" {...args} />;
    case "CellDamage":
      return (
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <CellDamage
            damage={{
              playerDamage: 3,
              playerStaminaDamage: 1,
              enemyDamage: 0,
              enemyStaminaDamage: 0,
            }}
            {...args}
          />
        </div>
      );
    case "Delta":
      return (
        <Delta
          row={{ key: "damage", label: "Урон", current: 2, candidate: 4 }}
          {...args}
        />
      );
    case "ItemCard":
      return (
        <ItemCard
          equipment={item("dagger")}
          actor={fighter}
          player={fighter}
          label="Предмет"
          rows={[]}
          candidate={false}
          compare={false}
          {...args}
        />
      );
    case "App":
      return <App {...args} />;
    case "BattleModeArtwork":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {(["free", "expendable"] as const).map((mode) => (
            <BattleModeArtwork key={mode} mode={mode} {...args} />
          ))}
        </div>
      );
    case "Mark":
      return <Mark {...args} />;

    case "Rules":
      return <Rules {...args} />;
    case "ItemDetails":
      return (
        <ItemDetails equipment={item("dagger")} fighter={fighter} {...args} />
      );
    case "Text":
      return (
        <Text size="md" color="primary" {...args}>
          {args.children !== undefined ? (
            (args.children as ReactNode)
          ) : (
            <>Герои Орвеска</>
          )}
        </Text>
      );
    case "ItemIcon":
      return (
        <ItemIcon size={120} framed {...args}>
          {args.children !== undefined ? (
            (args.children as ReactNode)
          ) : (
            <>
              <span>✦</span>
            </>
          )}
        </ItemIcon>
      );
    case "JourneyNodeIcon":
      return (
        <div style={{ position: "relative", height: 160 }}>
          <JourneyNodeIcon
            node={{
              id: "fight-1",
              kind: "fight",
              stage: 1,
              name: "Бой",
              x: 50,
              y: 50,
            }}
            status="Можно идти"
            available
            {...args}
          />
        </div>
      );
    case "CharacterCard":
      return (
        <Launch>
          {(close) => (
            <CharacterCard
              fighter={fighter}
              souls={12}
              busy={false}
              canUpgrade
              onUpgrade={noop}
              onInspect={noop}
              close={close}
              onHome={noop}
              onRules={noop}
              {...args}
            />
          )}
        </Launch>
      );
    case "GameMenuOptions":
      return (
        <GameMenuOptions
          busy={false}
          onClose={noop}
          onHome={noop}
          onRules={noop}
          {...args}
        />
      );
    case "FighterDialog":
      return (
        <Launch>
          {(close) => (
            <FighterDialog
              side="own"
              fighter={fighter}
              game={pub}
              busy={false}
              close={close}
              onInspect={noop}
              onUpgrade={noop}
              {...args}
            />
          )}
        </Launch>
      );
    case "GameScreen":
      return (
        <GameScreen
          game={mapGame}
          session="storybook"
          busy={false}
          error=""
          setError={noop}
          sendAction={async () => undefined}
          goHome={noop}
          {...args}
        />
      );
    case "Popup":
    case "CellPopup":
      return <PopupDemo name={name} args={args} />;
    case "Notification":
      return (
        <Launch>
          {(close) => (
            <Notification
              message="Вы ходите первый"
              {...args}
              onClose={close}
            />
          )}
        </Launch>
      );
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
          <CombatBackdrop journey={{ mapPreset: "forest" }} {...args} />
        </div>
      );
    case "BattleHeader":
      return (
        <BattleHeader
          screen="battle"
          player={pub.player}
          enemy={pub.enemy}
          mode="free"
          onPlayer={noop}
          onEnemy={noop}
          {...args}
        />
      );
    case "CharacterPortrait":
      return (
        <div className="sb-row" style={{ alignItems: "center" }}>
          <div style={{ width: 160 }}>
            <CharacterPortrait
              src={portrait(fighter.portraitId).src}
              alt={`Портрет: ${fighter.name}`}
              size="large"
              {...args}
            />
          </div>
          <CharacterPortrait
            src={portrait(fighter.portraitId).src}
            alt={`Портрет: ${fighter.name}`}
            size="small"
            {...args}
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
              <GothicIcon icon={icon} {...args} />
            </button>
          ))}
        </div>
      );
    case "GothicTextButton":
      return (
        <div className="sb-row">
          <GothicTextButton {...args}>
            {args.children !== undefined ? (
              (args.children as ReactNode)
            ) : (
              <>Продолжить приключение</>
            )}
          </GothicTextButton>
          <GothicTextButton disabled {...args}>
            {args.children !== undefined ? (
              (args.children as ReactNode)
            ) : (
              <>Недоступно</>
            )}
          </GothicTextButton>
          <div style={{ width: 180 }}>
            <GothicTextButton {...args}>
              {args.children !== undefined ? (
                (args.children as ReactNode)
              ) : (
                <>Очень длинная подпись автоматически уменьшается</>
              )}
            </GothicTextButton>
          </div>
        </div>
      );
    case "ResourceBar":
      return <ResourceBarDemo args={args} />;
    case "Modal":
      return (
        <Launch>
          {(close) => (
            <Modal
              title="Пример модального окна"
              close={close}
              size="small"
              {...args}
            >
              {args.children !== undefined ? (
                (args.children as ReactNode)
              ) : (
                <>
                  <p style={{ padding: 24 }}>Содержимое модального окна</p>
                  <ModalFooter hint="Подсказка над кнопкой" {...args}>
                    {args.children !== undefined ? (
                      (args.children as ReactNode)
                    ) : (
                      <>
                        <GothicTextButton onClick={close} {...args}>
                          {args.children !== undefined ? (
                            (args.children as ReactNode)
                          ) : (
                            <>Готово</>
                          )}
                        </GothicTextButton>
                      </>
                    )}
                  </ModalFooter>
                </>
              )}
            </Modal>
          )}
        </Launch>
      );
    case "ModalHeader":
      return <ModalHeader title="Заголовок" onClose={noop} {...args} />;
    case "ModalFooter":
      return (
        <div className="sb-stage">
          <ModalFooter hint="Распределите оставшиеся: 3" {...args}>
            {args.children !== undefined ? (
              (args.children as ReactNode)
            ) : (
              <>
                <GothicTextButton {...args}>
                  {args.children !== undefined ? (
                    (args.children as ReactNode)
                  ) : (
                    <>Продолжить</>
                  )}
                </GothicTextButton>
                <GothicTextButton {...args}>
                  {args.children !== undefined ? (
                    (args.children as ReactNode)
                  ) : (
                    <>Отмена</>
                  )}
                </GothicTextButton>
              </>
            )}
          </ModalFooter>
        </div>
      );
    case "SoulBalance":
      return (
        <div className="sb-row">
          {[0, 3, 125, 10000].map((amount) => (
            <SoulBalance key={amount} amount={amount} {...args} />
          ))}
        </div>
      );
    case "CharacterCreation":
      return (
        <Launch>
          {(close) => (
            <CharacterCreation onClose={close} onCreate={close} {...args} />
          )}
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
              {...args}
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
          {...args}
        />
      );
    case "CharacterStats":
      return <StatsDemo args={args} />;
    case "FighterDebuffs":
      return (
        <FighterDebuffs
          fighter={{
            ...fighter,
          }}
          {...args}
        />
      );
    case "CreatureDetails":
      return (
        <CreatureDetails
          fighter={{
            ...fighter,
            creatureId: "wolf",
            gear: {
              weapon: null,
              shield: null,
              body: null,
              feet: null,
              ring: null,
              amulet: null,
            },
          }}
          onInspect={noop}
          {...args}
        />
      );
    case "FighterPanel":
      return (
        <FighterPanel fighter={fighter} souls={12} onInspect={noop} {...args} />
      );
    case "EquipmentDoll":
      return (
        <div style={{ maxWidth: 400 }}>
          <EquipmentDoll fighter={fighter} onInspect={noop} {...args} />
        </div>
      );
    case "EquipmentIcon":
      return (
        <div className="sb-row">
          {["fist", "dagger", "buckler", "unlock-ring", "fold-amulet"].map(
            (id) => (
              <EquipmentIcon
                key={id}
                equipment={item(id)}
                framed
                size={120}
                {...args}
              />
            ),
          )}
        </div>
      );
    case "ItemInspection":
      return (
        <ItemInspection
          equipment={item("axe")}
          player={fighter}
          source="Награда"
          {...args}
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
              {...args}
            />
          )}
        </Launch>
      );
    case "SkillIcon":
      return <SkillIcon id="dodge" size={120} framed {...args} />;
    case "SkillCard":
      return <SkillCard id="dodge" fighter={fighter} {...args} />;
    case "FighterSkills":
      return <FighterSkills fighter={fighter} {...args} />;
    case "ActionSource":
      return <ActionSource m={token} {...args} />;
    case "FigureCard":
      return <FigureCard figure={token} stats={fighter.stats} {...args} />;
    case "ActionFigure":
      return (
        <div>
          <ActionFigure
            m={itemManeuvers(item("axe"))[1]}
            damage={9}
            {...args}
          />
        </div>
      );
    case "ActionPalette":
      return <PaletteDemo args={args} />;
    case "BattleWorkspace":
    case "ReactionBoard":
      return <BoardDemo args={args} />;
    case "BattleModeDialog":
      return (
        <Launch>
          {(close) => (
            <BattleModeDialog mode="expendable" onContinue={close} {...args} />
          )}
        </Launch>
      );
    case "BattleResultDialog":
      return (
        <Launch>
          {(close) => (
            <BattleResultDialog
              game={{ ...mapGame, phase: "victory", log: [outcome] }}
              onClose={close}
              {...args}
            />
          )}
        </Launch>
      );
    case "ClashOutcome":
      return (
        <ClashOutcome turn={outcome} onDone={noop} ending="Далее" {...args} />
      );

    case "Resources":
      return <Resources fighter={fighter} {...args} />;
    case "FloatingDamage":
      return (
        <div style={{ position: "relative", height: 160 }}>
          <FloatingDamage amount={4} {...args} />
        </div>
      );
    case "RockTerrain":
      return (
        <div
          className="terrain-board"
          style={{ position: "relative", width: 300, height: 300 }}
        >
          <RockTerrain blocked={[0, 1, 4]} {...args} />
        </div>
      );
    case "GameMenu":
      return (
        <Launch>
          {(close) => (
            <GameMenu
              busy={false}
              onClose={close}
              onHome={close}
              onRules={close}
              onMap={close}
              {...args}
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
            onRules={noop}
            {...args}
          />
        </div>
      );
    case "BattleModeInfo":
      return <BattleModeInfo game={pub} {...args} />;
    case "JourneyMap":
      return <JourneyDemo args={args} />;
    case "JourneyScreen":
      return <JourneyDemo screen args={args} />;
    case "JourneyChoices":
      return (
        <JourneyChoices
          game={mapGame}
          busy={false}
          onNext={noop}
          onInspect={noop}
          {...args}
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
          {...args}
        />
      );
    case "VictoryRewardDialog":
      return <Launch>{() => <RewardDemo args={args} />}</Launch>;
    default:
      throw new Error(`Не настроен пример для ${name}`);
  }
}
