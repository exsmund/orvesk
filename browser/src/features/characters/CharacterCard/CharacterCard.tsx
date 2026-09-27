import { CreatureDetails } from "@/features/creatures/CreatureDetails";
import { Text } from "@/shared/ui/Text";
import "@/features/characters/CharacterCard/CharacterCard.css";
import { useId, useState, type KeyboardEvent } from "react";
import { portrait } from "@/game/characters/portraits";
import { level } from "@/game/progression/souls";
import type { Fighter, Stat } from "@/game/types";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { GameMenuOptions } from "@/shared/ui/GameMenuOptions/GameMenuOptions";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { Modal } from "@/shared/ui/Modal/Modal";
import { useModalPageScroll } from "@/shared/ui/Modal/useModalPageScroll";
import { Resources } from "@/features/combat/Resources/Resources";
import type { ResourceChange } from "@/features/combat/resource-preview";
import { EquipmentDoll } from "@/features/equipment/EquipmentDoll/EquipmentDoll";
import { FighterSkills } from "@/features/skills/FighterSkills/FighterSkills";
import { CharacterStats } from "@/features/characters/CharacterStats/CharacterStats";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";

import { tabs } from "@/features/characters/CharacterCard/model";
export function CharacterCard({
  fighter,
  souls,
  busy,
  canUpgrade,
  onUpgrade,
  onInspect,
  close,
  onHome,
  onRules,
  onMap,
  preview,
}: {
  fighter: Fighter;
  souls: number;
  busy: boolean;
  canUpgrade: boolean;
  onUpgrade: (stat: Stat) => void;
  onInspect: (id: string) => void;
  close: () => void;
  onHome: () => void;
  onRules: () => void;
  onMap?: () => void;
  preview?: ResourceChange;
}) {
  const [tab, setTab] = useState(0),
    id = useId(),
    scrollRef = useModalPageScroll();
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 4
        : event.key === "ArrowLeft"
          ? (index + 3) % 4
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 3
              : null;
    if (next === null) return;
    event.preventDefault();
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return (
    <Modal
      title={fighter.name}
      close={close}
      variant="bare"
      className="character-card"
      portal
    >
      <header className="character-card__toolbar" ref={scrollRef}>
        <div
          className="character-card__tabs"
          role="tablist"
          aria-label="Разделы персонажа"
        >
          {tabs.map((name, index) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-label={name}
              title={name}
              aria-selected={tab === index}
              aria-controls={`${id}-panel`}
              tabIndex={tab === index ? 0 : -1}
              onKeyDown={(event) => navigate(event, index)}
              onClick={() => setTab(index)}
            >
              <span
                className="character-card__tab-icon"
                style={{ backgroundPositionX: `${(index * 100) / 3}%` }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="character-card__close"
          aria-label="Закрыть карточку героя"
          onClick={close}
        >
          <GothicIcon icon="close" />
        </button>
      </header>
      <div
        key={tab}
        className="character-card__body"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 0 && (
          <div className="character-card__identity">
            <Text as="h2">{fighter.name}</Text>
            <CharacterPortrait
              dead={fighter.hp <= 0}
              src={portrait(fighter.portraitId).src}
              alt={fighter.name}
            />
            <Text as="p">Уровень {level(fighter)}</Text>
            <SoulBalance amount={souls} />
            <Resources fighter={fighter} preview={preview} />
          </div>
        )}
        {tab === 1 && (
          <>
            <CharacterStats
              fighter={fighter}
              souls={souls}
              busy={busy || !canUpgrade}
              onUpgrade={onUpgrade}
            />
            {!canUpgrade && (
              <Text as="p" className="upgrade-note">
                Повышение характеристик доступно вне боя.
              </Text>
            )}
          </>
        )}
        {tab === 2 && (
          <div className="character-card__equipment">
            {fighter.creatureId ? <CreatureDetails fighter={fighter} onInspect={equipment => onInspect(equipment.id)}/> : <>
            <EquipmentDoll
              fighter={fighter}
              onInspect={(equipment) => onInspect(equipment.id)}
            />
            <FighterSkills fighter={fighter} />
            </>}
          </div>
        )}
        {tab === 3 && (
          <GameMenuOptions
            busy={busy}
            onClose={close}
            onHome={onHome}
            onRules={onRules}
            onMap={onMap}
          />
        )}
      </div>
    </Modal>
  );
}
