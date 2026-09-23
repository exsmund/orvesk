import type { ResourceChange } from "../combat/resource-preview";
import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import type { Fighter, Item, Stat } from "../../game/types";
import { level } from "../../game/progression/souls";
import { maxHp } from "../../game/combat/engine";
import { STYLES } from "../../game/combat/tactics";
import { portrait } from "../../game/characters/portraits";
import { Resources } from "../combat/TacticalHUD";
import { FloatingDamage } from "../combat/BattleEffects";
import { FighterDebuffs } from "./FighterDebuffs";
import { SoulBalance } from "./SoulBalance";
import { CharacterStats } from "./CharacterStats";
import { EquipmentDoll } from "../equipment/EquipmentDoll";
import { FighterSkills } from "../skills/SkillUI";
import { knownSkills } from "../../game/skills/skills";
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
        {enemy
          ? STYLES[fighter.style ?? "berserker"].name.toUpperCase()
          : "ВАШ ПЕРСОНАЖ"}
        <span>УРОВЕНЬ {level(fighter)}</span>
      </div>
      <div className="fighter-identity">
        <CharacterPortrait
          className={onOpen ? "fighter-portrait-button" : "portrait-frame"}
          src={portrait(fighter.portraitId).src}
          alt={onOpen ? "" : `Портрет: ${portrait(fighter.portraitId).label}`}
          onClick={onOpen}
          label={`${enemy ? "Противник" : "Ваш персонаж"}: ${fighter.name}`}
          title={`${fighter.name} · Здоровье ${fighter.hp}/${maxHp(fighter)}. Характеристики и экипировка`}
        />
        <h2>
          {onOpen ? (
            <button className="fighter-name-button" onClick={onOpen}>
              {fighter.name}
            </button>
          ) : (
            fighter.name
          )}
        </h2>
      </div>
      <Resources fighter={fighter} preview={preview} />
      {damage > 0 && <FloatingDamage key={damageId} amount={damage} />}
      <FighterDebuffs fighter={fighter} onOpen={onOpen} />
      {((!fighter.offBalance && !fighter.prone) || fighter.hp <= 0) && (
        <div className="status-text">
          {fighter.hp <= 0 ? "Повержен" : "Готов к поединку"}
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
      <div className="section-caption">ЭКИПИРОВКА</div>
      <EquipmentDoll fighter={fighter} onInspect={onInspect} />
      <>
        {onOpen ? (
          <button className="fighter-skills-open secondary" onClick={onOpen}>
            Навыки · {knownSkills(fighter).length}/3
          </button>
        ) : (
          <FighterSkills fighter={fighter} />
        )}
      </>
    </aside>
  );
}
