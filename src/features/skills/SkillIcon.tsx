import { skillArtwork } from "./skill-artwork";
import type { SkillId } from "../../game/skills/skills";

export function SkillIcon({ id }: { id: SkillId }) {
  return (
    <img
      className="skill-artwork"
      src={skillArtwork(id)}
      alt=""
      aria-hidden="true"
    />
  );
}
