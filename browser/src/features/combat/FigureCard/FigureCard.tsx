import { ActionFigure } from "@/features/combat/ActionFigure";
import { figureEffects } from "@/features/combat/FigureCard/model";
import { figureCellDamage } from "@/game/combat/figure-power";
import type { Maneuver, Stats } from "@/game/types";
import { Text } from "@/shared/ui/Text";
import "@/features/combat/FigureCard/FigureCard.css";

export function FigureCard({
  figure,
  stats,
}: {
  figure: Maneuver;
  stats: Stats;
}) {
  const damage = figureCellDamage({ stats }, figure) * figure.shape.length;
  return (
    <article className="figure-card" aria-label={figure.name}>
      <ActionFigure m={figure} damage={damage} />
      <div className="figure-card__details">
        <Text as="h4" size="sm" color="primary" weight="bold">
          {figure.name}
        </Text>
        {figureEffects(figure, stats).map((line) => (
          <Text as="p" size="sm" color="primary" key={line}>
            {line}
          </Text>
        ))}
      </div>
    </article>
  );
}
