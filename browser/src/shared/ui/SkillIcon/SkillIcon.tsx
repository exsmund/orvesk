import { skill, type SkillId } from "@/game/skills/skills";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { type ItemIconProps } from "@/shared/ui/ItemIcon/model";
export function SkillIcon({
  id,
  className = "",
  ...props
}: Omit<ItemIconProps, "children"> & { id: SkillId }) {
  return (
    <ItemIcon {...props} className={`skill-icon ${className}`}>
      <img src={skill(id)?.art} alt="" loading="lazy" decoding="async" />
    </ItemIcon>
  );
}
