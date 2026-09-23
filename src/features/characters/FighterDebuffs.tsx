import { CircleAlert, PersonStanding } from "lucide-react";
import type { Fighter } from "../../game/types";

export function FighterDebuffs({
  fighter,
  onOpen,
}: {
  fighter: Fighter;
  onOpen?: () => void;
}) {
  if (fighter.hp <= 0) return null;
  const effects = [
    ...(fighter.frostImmune
      ? [
          {
            id: "frost-protection",
            Icon: CircleAlert,
            name: "Защита от мороза",
            effect: "1 раунд",
            description:
              "Мороз наносит урон, но не может снова уменьшить лимит клеток в этом раунде.",
          },
        ]
      : []),
    ...(fighter.offBalance
      ? [
          {
            id: "balance",
            Icon: CircleAlert,
            name: "Потеря равновесия",
            effect: "−1 клетка",
            description:
              "Лимит подготовки или реакции уменьшен на 1 клетку на один раунд. После завершения штрафа один раунд действует защита от повторного замедления морозом.",
          },
        ]
      : []),
    ...(fighter.prone
      ? [
          {
            id: "prone",
            Icon: PersonStanding,
            name: "На земле",
            effect: "Только подъём",
            description:
              "В раунде доступна только фигура «Подъём». Она полностью восстанавливает стойку и защищает её от потери на этот раунд. Урон здоровью сохраняется; атаковать и блокировать нельзя.",
          },
        ]
      : []),
  ];
  if (!effects.length) return null;
  return (
    <div
      className="fighter-debuffs"
      role="status"
      aria-label={`Дебафы: ${fighter.name}`}
    >
      {effects.map(({ id, Icon, name, effect, description }) => {
        const content = (
          <>
            <Icon size={15} aria-hidden="true" />
            <span>
              <span className="debuff-heading">
                <b>{name}</b>
                <strong>{effect}</strong>
              </span>
              <small>{description}</small>
            </span>
          </>
        );
        return onOpen ? (
          <button
            key={id}
            className="fighter-debuff"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`${name}: ${effect}. ${description}`}
            title={`${name}: ${effect}. ${description}`}
          >
            {content}
          </button>
        ) : (
          <div key={id} className="fighter-debuff">
            {content}
          </div>
        );
      })}
    </div>
  );
}
