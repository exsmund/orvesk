import { useState } from "react";
import { Text } from "@/shared/ui/Text";
import { GothicTextButton } from "@/shared/ui/GothicTextButton";
import {
  balance,
  deckStatKeys,
  deckLevel,
  deckMaxHealth,
  validDeckStats,
  type DeckFighterStats,
} from "./deck-progression";
import "./DeckStatsEditor.css";
import {
  armorRules,
  armorReduction,
  validArmor,
  type DeckArmor,
} from "./deck-armor";

export function DeckStatsEditor({
  value,
  armor,
  onApply,
}: {
  value: DeckFighterStats;
  armor: DeckArmor;
  onApply: (stats: DeckFighterStats, armor: DeckArmor) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [draftArmor, setDraftArmor] = useState(armor);
  const valid =
    validDeckStats(draft.player) &&
    validDeckStats(draft.wolf) &&
    validArmor(draftArmor.player) &&
    validArmor(draftArmor.wolf);
  const changed =
    JSON.stringify([value, armor]) !== JSON.stringify([draft, draftArmor]);
  return (
    <details className="dw-stats-editor">
      <summary>
        <Text>Характеристики, уровень и броня</Text>
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onApply(draft, draftArmor);
        }}
      >
        <div className="dw-stats-editor__fighters">
          {(["player", "wolf"] as const).map((side) => {
            const name = side === "player" ? "Герой" : "Волк";
            return (
              <fieldset key={side}>
                <legend>
                  <Text weight="bold">{name}</Text>
                </legend>
                {deckStatKeys.map((stat) => (
                  <label className="dw-stats-editor__stat" key={stat}>
                    <Text>{balance.stats[stat]}</Text>
                    <input
                      type="number"
                      required
                      min={balance.baseStat}
                      max={balance.maxStat}
                      step={1}
                      aria-label={`${name}: ${balance.stats[stat]}`}
                      value={
                        Number.isNaN(draft[side][stat]) ? "" : draft[side][stat]
                      }
                      onChange={(event) => {
                        const number = event.currentTarget.valueAsNumber;
                        setDraft((previous) => ({
                          ...previous,
                          [side]: { ...previous[side], [stat]: number },
                        }));
                      }}
                    />
                  </label>
                ))}
                <Text as="p" color="accent" aria-live="polite">
                  {validDeckStats(draft[side])
                    ? `Уровень ${deckLevel(draft[side])} · Здоровье ${deckMaxHealth(draft[side])} · Выносливость 8`
                    : `Введите целые числа от ${balance.baseStat} до ${balance.maxStat}.`}
                </Text>
                <label className="dw-stats-editor__stat">
                  <Text>Броня</Text>
                  <input
                    type="number"
                    required
                    min={0}
                    max={armorRules.max}
                    step={1}
                    aria-label={`${name}: Броня`}
                    value={
                      Number.isNaN(draftArmor[side]) ? "" : draftArmor[side]
                    }
                    onChange={(event) => {
                      const number = event.currentTarget.valueAsNumber;
                      setDraftArmor((previous) => ({
                        ...previous,
                        [side]: number,
                      }));
                    }}
                  />
                </label>
                <div className="dw-stats-editor__presets">
                  {armorRules.presets.map((amount) => (
                    <GothicTextButton
                      key={amount}
                      type="button"
                      size="compact"
                      variant="secondary"
                      width="auto"
                      aria-label={`${name}: броня ${amount}`}
                      aria-pressed={draftArmor[side] === amount}
                      onClick={() =>
                        setDraftArmor((previous) => ({
                          ...previous,
                          [side]: amount,
                        }))
                      }
                    >
                      {amount}
                    </GothicTextButton>
                  ))}
                </div>
                <Text as="p" size="sm" color="muted" aria-live="polite">
                  {validArmor(draftArmor[side])
                    ? `Поглощает ${armorReduction(draftArmor[side])}% урона здоровью. Уровень не меняется.`
                    : `Введите целую броню от 0 до ${armorRules.max}.`}
                </Text>
              </fieldset>
            );
          })}
        </div>
        <Text as="p" size="sm">
          Уровень = {balance.baseLevel} + сумма очков сверх {balance.baseStat} в
          каждой характеристике. Здоровье = {balance.baseHealth} +{" "}
          {balance.healthPerPoint} × (уровень − {balance.baseLevel}). Сила
          усиливает удар и тяжёлый удар на 1 за клетку; ловкость — выпад на 2 и
          контрудар парирования на 1 за клетку за каждое очко сверх 1.
        </Text>
        <Text as="p" size="sm" color="muted">
          Интеллект в этой колоде увеличивает только здоровье: магических карт
          нет, очередность ходов не зависит от характеристик. Выносливость —
          только ресурс: максимум 8, восстановление по 2 за ход. Стоимость
          действий и урон выносливости не растут.
        </Text>
        <Text as="p" size="sm">
          Урон после брони = урон после взаимодействия фигур × {armorRules.k} /
          ({armorRules.k} + броня получателя). Броня уменьшает только урон
          здоровью, включая контрудар парирования. Полный блок и уклонение
          сохраняются. Итоговый урон здоровью округляется до десятых после
          расчёта всего хода.
        </Text>
        {changed && (
          <Text as="p" color="accent" role="status">
            Изменения ещё не применены к текущему бою.
          </Text>
        )}
        <div className="dw-stats-editor__apply">
          <GothicTextButton
            type="submit"
            size="compact"
            width="auto"
            disabled={!valid}
          >
            Применить и начать бой
          </GothicTextButton>
        </div>
      </form>
    </details>
  );
}
