import { GothicIcon } from "../../shared/ui/GothicIcon";
import { STATS } from "../../game/equipment/catalog";
import { STAT_KEYS, type Fighter, type Stat } from "../../game/types";
import { upgradeCost } from "../../game/progression/souls";
import { SoulBalance } from "./SoulBalance";
import { soulWord } from "./soul-word";
import "./souls.css";
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
        <p className="upgrade-price">
          Повысить на +1: <SoulBalance amount={cost} />
        </p>
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
              <span>
                <span className="stat-name">{STATS[stat]}</span>
                {required !== undefined && (
                  <small>
                    Требуется {required}
                    {current < required
                      ? ` · не хватает ${required - current}`
                      : " · выполнено"}
                  </small>
                )}
              </span>
              <strong>{current}</strong>
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
        <small className="upgrade-note">
          {(souls ?? 0) < cost ? "Недостаточно душ. " : ""}Повышение сохраняется
          сразу. Следующее будет дороже.
        </small>
      )}
    </section>
  );
}
