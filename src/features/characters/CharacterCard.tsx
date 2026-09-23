import { useId, useState, type KeyboardEvent } from "react";
import type { Fighter, Stat } from "../../game/types";
import { level } from "../../game/progression/souls";
import { portrait } from "../../game/characters/portraits";
import { Modal } from "../../shared/ui/Modal";
import { GothicIcon } from "../../shared/ui/GothicIcon";
import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import { useModalPageScroll } from "../../shared/ui/useModalPageScroll";
import { GameMenuOptions } from "../../shared/ui/GameMenu";
import { Resources } from "../combat/TacticalHUD";
import type { ResourceChange } from "../combat/resource-preview";
import { EquipmentDoll } from "../equipment/EquipmentDoll";
import { FighterSkills } from "../skills/SkillUI";
import { CharacterStats } from "./CharacterStats";
import { SoulBalance } from "./SoulBalance";
import "./character-card.css";
const tabs = ["Персонаж", "Характеристики", "Экипировка", "Меню"] as const;
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
  onJournal,
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
  onJournal?: () => void;
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
            <h2>{fighter.name}</h2>
            <CharacterPortrait
              src={portrait(fighter.portraitId).src}
              alt={fighter.name}
            />
            <p>Уровень {level(fighter)}</p>
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
              <p className="upgrade-note">
                Повышение характеристик доступно вне боя.
              </p>
            )}
          </>
        )}
        {tab === 2 && (
          <div className="character-card__equipment">
            <EquipmentDoll
              fighter={fighter}
              onInspect={(equipment) => onInspect(equipment.id)}
            />
            <FighterSkills fighter={fighter} />
          </div>
        )}
        {tab === 3 && (
          <GameMenuOptions
            busy={busy}
            onClose={close}
            onHome={onHome}
            onRules={onRules}
            onMap={onMap}
            onJournal={onJournal}
          />
        )}
      </div>
    </Modal>
  );
}
