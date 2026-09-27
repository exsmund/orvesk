import { Text } from "@/shared/ui/Text";
import "@/features/characters/CharacterStats/CharacterStats.css";
import { STATS } from "@/game/equipment/catalog";
import { upgradeCost } from "@/game/progression/souls";
import { STAT_KEYS, type Fighter, type Stat } from "@/game/types";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import { soulWord } from "@/features/characters/soul-word";

export function CharacterStats({
  fighter,
  souls,
  busy = false,
  onUpgrade,
  requirements,
}: {
  fighter: Fighter;
  souls?: number;
  busy?: boolean;
  onUpgrade?: (stat: Stat) => void;
  requirements?: Partial<Record<Stat, number>>;
}) {
  const cost = upgradeCost(fighter),
    keys = requirements
      ? STAT_KEYS.filter((stat) => (requirements[stat] ?? 0) > 0)
      : STAT_KEYS;
  return (
    <section
      className="character-attributes"
      aria-label={requirements ? "Требования предмета" : "Характеристики"}
    >
      {onUpgrade && (
        <Text as="p" className="upgrade-price">
          <Text className="upgrade-price__cost">
            Повысить на +1: <SoulBalance amount={cost} />
          </Text>
          <Text className="upgrade-price__balance">
            У вас: <SoulBalance amount={souls ?? 0} />
          </Text>
        </Text>
      )}
      <div className="stats">
        {keys.map((stat) => {
          const required = requirements?.[stat],
            current = fighter.stats[stat];
          return (
            <div
              key={stat}
              className={required && current < required ? "unmet" : ""}
            >
              <Text as="span">
                <Text as="span" className="stat-name">
                  {STATS[stat]}
                </Text>
                {required !== undefined && (
                  <Text as="small">
                    Требуется {required}
                    {current < required
                      ? ` · не хватает ${required - current}`
                      : " · выполнено"}
                  </Text>
                )}
              </Text>
              <Text as="strong">{current}</Text>
              {onUpgrade && (
                <button
                  type="button"
                  className="stat-upgrade gothic-button"
                  disabled={busy || (souls ?? 0) < cost}
                  aria-label={`Повысить ${STATS[stat]}: ${current} → ${current + 1}, ${cost} ${soulWord(cost)}`}
                  onClick={() => onUpgrade(stat)}
                >
                  <GothicIcon icon="plus" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {onUpgrade && (
        <Text as="small" className="upgrade-note">
          {(souls ?? 0) < cost ? "Недостаточно осколков. " : ""}Повышение сохраняется
          сразу. Следующее будет дороже.
        </Text>
      )}
    </section>
  );
}
