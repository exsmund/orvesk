import { CreatureDetails } from "@/features/creatures/CreatureDetails";
import { Text } from "@/shared/ui/Text";
import "@/features/characters/FighterPanel/FighterPanel.css";
import { portrait } from "@/game/characters/portraits";
import { maxHp } from "@/game/combat/engine";
import { STYLES } from "@/game/combat/tactics";
import { level } from "@/game/progression/souls";
import { knownSkills } from "@/game/skills/skills";
import type { Fighter, Item, Stat } from "@/game/types";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { FloatingDamage } from "@/features/combat/FloatingDamage/FloatingDamage";
import type { ResourceChange } from "@/features/combat/resource-preview";
import { Resources } from "@/features/combat/Resources/Resources";
import { EquipmentDoll } from "@/features/equipment/EquipmentDoll/EquipmentDoll";
import { FighterSkills } from "@/features/skills/FighterSkills/FighterSkills";
import { CharacterStats } from "@/features/characters/CharacterStats/CharacterStats";
import { FighterDebuffs } from "@/features/characters/FighterDebuffs/FighterDebuffs";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
export function FighterPanel({
  fighter,
  preview,
  enemy = false,
  onInspect,
  damage = 0,
  damageId,
  onOpen,
  souls,
  busy,
  onUpgrade,
}: {
  souls?: number;
  busy?: boolean;
  onUpgrade?: (stat: Stat) => void;
  onOpen?: () => void;
  fighter: Fighter;
  preview?: ResourceChange;
  enemy?: boolean;
  damage?: number;
  damageId?: string;
  onInspect: (equipment: Item) => void;
}) {
  return (
    <aside className={`fighter-panel ${enemy ? "opponent-panel" : ""}`}>
      <div className="eyebrow">
        <Text>
          {enemy
            ? fighter.creatureId
              ? "ПРОТИВНИК"
              : STYLES[fighter.style ?? "berserker"].name.toUpperCase()
            : "ВАШ ПЕРСОНАЖ"}
        </Text>
        <Text as="span">УРОВЕНЬ {level(fighter)}</Text>
      </div>
      <div className="fighter-identity">
        <CharacterPortrait
          dead={fighter.hp <= 0}
          side={enemy ? "enemy" : "player"}
          className={onOpen ? "fighter-portrait-button" : "portrait-frame"}
          src={portrait(fighter.portraitId).src}
          alt={onOpen ? "" : `Портрет: ${portrait(fighter.portraitId).label}`}
          onClick={onOpen}
          label={`${enemy ? "Противник" : "Ваш персонаж"}: ${fighter.name}`}
          title={`${fighter.name} · Здоровье ${fighter.hp}/${maxHp(fighter)}. Характеристики и экипировка`}
        />
        <Text as="h2">
          {onOpen ? (
            <button className="fighter-name-button" onClick={onOpen}>
              {fighter.name}
            </button>
          ) : (
            fighter.name
          )}
        </Text>
      </div>
      <Resources fighter={fighter} preview={preview} />
      {damage > 0 && <FloatingDamage key={damageId} amount={damage} />}
      <FighterDebuffs fighter={fighter} onOpen={onOpen} />
      {(!fighter.exhausted || fighter.hp <= 0) && (
        <div className="status-text">
          <Text>{fighter.hp <= 0 ? "Повержен" : "Готов к поединку"}</Text>
        </div>
      )}
      <>
        {souls !== undefined && <SoulBalance amount={souls} />}
        <CharacterStats
          fighter={fighter}
          souls={souls}
          busy={busy}
          onUpgrade={onUpgrade}
        />
      </>
      {fighter.creatureId ? (
        <CreatureDetails fighter={fighter} onInspect={onInspect} />
      ) : (
        <>
          <div className="section-caption">
            <Text>ЭКИПИРОВКА</Text>
          </div>
          <EquipmentDoll fighter={fighter} onInspect={onInspect} />
          <>
            {onOpen ? (
              <button
                className="fighter-skills-open secondary"
                onClick={onOpen}
              >
                <Text>Навыки · </Text>
                <Text>{knownSkills(fighter).length}</Text>
                <Text>/3</Text>
              </button>
            ) : (
              <FighterSkills fighter={fighter} />
            )}
          </>
        </>
      )}
    </aside>
  );
}
