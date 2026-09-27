import { Text } from "@/shared/ui/Text";
import "@/features/skills/SkillCard/SkillCard.css";

import { skill, skillManeuver, type SkillId } from "@/game/skills/skills";
import type { Fighter } from "@/game/types";
import { FigureCard } from "@/features/combat/FigureCard";

export function SkillCard({ id, fighter }: { id: SkillId; fighter?: Fighter }) {
  const s = skill(id)!;
  if (s.figure)
    return (
      <FigureCard
        figure={skillManeuver(s)}
        stats={
          fighter?.stats ?? {
            strength: 1,
            agility: 1,
            vitality: 1,
            intelligence: 1,
          }
        }
      />
    );
  return (
    <article className="skill-card">
      <div>
        <Text as="h4">{s.name}</Text>
        <Text as="p">{s.description}</Text>
        <Text as="small">Пассивный навык</Text>
      </div>
    </article>
  );
}
