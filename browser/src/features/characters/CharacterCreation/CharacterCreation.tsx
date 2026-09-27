import { Text } from "@/shared/ui/Text";
import "@/features/characters/CharacterCreation/CharacterCreation.css";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";

import { useRef, useState } from "react";
import { PORTRAITS } from "@/game/characters/portraits";
import { STATS } from "@/game/equipment/catalog";
import {
  MIN_STARTING_STAT,
  STARTING_STAT_TOTAL,
  initialStartingStats,
} from "@/game/progression/creation-rules";
import { STAT_KEYS, type Stat } from "@/game/types";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";

import {
  NewCharacter,
  descriptions,
} from "@/features/characters/CharacterCreation/model";
export function CharacterCreation({
  onClose,
  onCreate,
  busy = false,
  error = "",
}: {
  onClose: () => void;
  onCreate: (draft: NewCharacter) => void;
  busy?: boolean;
  error?: string;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1),
    [index, setIndex] = useState(() =>
      Math.floor(Math.random() * PORTRAITS.length),
    ),
    [name, setName] = useState(""),
    [stats, setStats] = useState(initialStartingStats);
  const remaining =
      STARTING_STAT_TOTAL - STAT_KEYS.reduce((sum, key) => sum + stats[key], 0),
    face = PORTRAITS[index];
  function changePortrait(direction: number) {
    setIndex((n) => (n + direction + PORTRAITS.length) % PORTRAITS.length);
  }
  function changeStat(stat: Stat, amount: number) {
    if (busy) return;
    setStats((current) => {
      const left =
        STARTING_STAT_TOTAL -
        STAT_KEYS.reduce((sum, key) => sum + current[key], 0);
      if (
        (amount > 0 && left <= 0) ||
        (amount < 0 && current[stat] <= MIN_STARTING_STAT)
      )
        return current;
      return { ...current, [stat]: current[stat] + amount };
    });
  }
  return (
    <main className="creation-backdrop" aria-label="Создание персонажа">
      <img
        className="start-landscape"
        src="/ui/start-landscape-v1.png"
        alt=""
      />
      <Modal
        className="creation-dialog"
        size="small"
        title={step === 1 ? "Создание персонажа" : "Характеристики"}
        titleId="creation-dialog-title"
        onBack={step === 2 ? () => setStep(1) : undefined}
        close={onClose}
        disabled={busy}
        closeOnBackdrop={false}
        backLabel="Вернуться к портрету и имени"
        closeLabel="Закрыть создание персонажа"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (step === 1) {
              if (name.trim()) setStep(2);
              else nameInput.current?.focus();
            } else if (remaining === 0 && name.trim())
              onCreate({ name: name.trim(), portraitId: face.id, stats });
          }}
        >
          <div className="creation-dialog-body">
            {step === 1 ? (
              <>
                <div className="creation-carousel" aria-label="Выбор портрета">
                  <button
                    type="button"
                    className="portrait-arrow gothic-button"
                    aria-label="Предыдущий портрет"
                    onClick={() => changePortrait(-1)}
                  >
                    <GothicIcon icon="left" />
                  </button>
                  <CharacterPortrait
                    className="creation-portrait-frame"
                    src={face.src}
                    alt={`Портрет: ${face.label}`}
                  />
                  <button
                    type="button"
                    className="portrait-arrow gothic-button"
                    aria-label="Следующий портрет"
                    onClick={() => changePortrait(1)}
                  >
                    <GothicIcon icon="right" />
                  </button>
                </div>
                <div className="creation-name">
                  <input
                    aria-label="Имя"
                    className="gothic-text-input"
                    ref={nameInput}
                    id="creation-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={24}
                    required
                    autoComplete="off"
                    placeholder="Имя персонажа"
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  className="creation-soul-row"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <SoulBalance amount={remaining} />
                </div>
                <div className="creation-allocation">
                  {STAT_KEYS.map((stat) => (
                    <div className="allocation-row" key={stat}>
                      <Text as="label" htmlFor={`starting-${stat}`}>
                        <Text as="span" className="stat-name">
                          {STATS[stat]}
                        </Text>
                        <Text as="small">{descriptions[stat]}</Text>
                      </Text>
                      <div className="allocation-controls">
                        <button
                          type="button"
                          className="gothic-button"
                          aria-label={`Уменьшить: ${STATS[stat]}`}
                          disabled={busy || stats[stat] === MIN_STARTING_STAT}
                          onClick={() => changeStat(stat, -1)}
                        >
                          <GothicIcon icon="minus" />
                        </button>
                        <output
                          id={`starting-${stat}`}
                          aria-label={STATS[stat]}
                        >
                          <Text>{stats[stat]}</Text>
                        </output>
                        <button
                          type="button"
                          className="gothic-button"
                          aria-label={`Увеличить: ${STATS[stat]}`}
                          disabled={busy || remaining === 0}
                          onClick={() => changeStat(stat, 1)}
                        >
                          <GothicIcon icon="plus" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {error && (
              <Text as="p" className="error" role="alert">
                {error}
              </Text>
            )}
          </div>
          <ModalFooter
            hint={
              step === 2
                ? remaining > 0
                  ? `Распределите оставшиеся осколки: ${remaining}`
                  : "Все осколки распределены"
                : !name.trim()
                  ? "Введите имя персонажа"
                  : undefined
            }
          >
            <GothicTextButton
              variant="primary"
              type="submit"
              disabled={busy || !name.trim() || (step === 2 && remaining !== 0)}
            >
              {busy
                ? "Открываем тропу…"
                : step === 1
                  ? "Далее"
                  : "Вступить на тропу"}
            </GothicTextButton>
          </ModalFooter>
        </form>
      </Modal>
    </main>
  );
}
