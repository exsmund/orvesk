import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import { SkillIcon } from "./SkillIcon";
import "./skill-slots.css";
import { ActionFigure } from "../combat/ActionFigures";
import {
  knownSkills,
  MAX_SKILLS,
  skill,
  skillManeuver,
  type SkillId,
} from "../../game/skills/skills";
import type { Fighter } from "../../game/types";
import "./skills.css";
export function SkillCard({ id, fighter }: { id: SkillId; fighter?: Fighter }) {
  const s = skill(id)!;
  return (
    <article className="skill-card">
      <ActionFigure m={skillManeuver(s, fighter)} />
      <div>
        <h4>{s.name}</h4>
        <p>{s.description}</p>
        <small>
          {s.shape.length} кл. · Восстановление: 1 раунд
          {fighter?.cooldowns?.[`skill:${id}`] ? " · Сейчас недоступен" : ""}
        </small>
      </div>
    </article>
  );
}
export function FighterSkills({ fighter }: { fighter: Fighter }) {
  const skills = knownSkills(fighter);
  const [selected, setSelected] = useState<SkillId | null>(null);
  return (
    <>
      <section
        className="fighter-skill-slots"
        aria-label={`Навыки: ${fighter.name}`}
      >
        {Array.from({ length: MAX_SKILLS }, (_, i) => {
          const s = skills[i];
          return (
            <button
              key={i}
              type="button"
              className={`fighter-skill-slot ${s ? "occupied" : "empty"}`}
              disabled={!s}
              aria-label={s ? `Навык: ${s.name}` : `Навык ${i + 1}: пусто`}
              title={s?.name ?? "Свободная ячейка навыка"}
              aria-haspopup={s ? "dialog" : undefined}
              onClick={() => s && setSelected(s.id)}
            >
              {s ? (
                <SkillIcon id={s.id} />
              ) : (
                <Sparkles size={24} strokeWidth={1.2} />
              )}
            </button>
          );
        })}
      </section>
      {selected && (
        <Modal title={skill(selected)!.name} close={() => setSelected(null)}>
          <div className="skill-slot-details">
            <SkillCard id={selected} fighter={fighter} />
          </div>
        </Modal>
      )}
    </>
  );
}
