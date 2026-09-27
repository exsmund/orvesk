import "@/features/skills/FighterSkills/FighterSkills.css";
import { useState } from "react";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { Modal } from "@/shared/ui/Modal/Modal";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";

import {
  knownSkills,
  MAX_SKILLS,
  skill,
  type SkillId,
} from "@/game/skills/skills";
import type { Fighter } from "@/game/types";

import { SkillCard } from "@/features/skills/SkillCard/SkillCard";
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
                <SkillIcon id={s.id} size="100%" framed />
              ) : (
                <ItemIcon size="100%" framed />
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
