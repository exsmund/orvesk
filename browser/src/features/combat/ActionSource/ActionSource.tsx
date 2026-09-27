import { figureArt } from "@/game/combat/figure-art";
import { Text } from "@/shared/ui/Text";
import "@/features/combat/ActionSource/ActionSource.css";
import { item } from "@/game/equipment/catalog";
import type { Maneuver } from "@/game/types";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";

import { sourceName } from "@/features/combat/ActionSource/model";
export function ActionSource({
  m,
  size,
}: {
  m: Maneuver;
  size?: number | "100%";
}) {
  const art = figureArt(m);
  if (art)
    return (
      <Text
        as="span"
        className="action-source"
        style={size === undefined ? undefined : { width: size, height: size }}
        title={m.name}
      >
        <img src={art} alt={m.name} />
      </Text>
    );
  if (m.skillId)
    return (
      <Text
        as="span"
        className="action-source skill-source"
        style={size === undefined ? undefined : { width: size, height: size }}
        role="img"
        aria-label={sourceName(m)}
        title={sourceName(m)}
      >
        <SkillIcon id={m.skillId} size="100%" />
      </Text>
    );
  const id = m.weaponId ?? m.shieldId ?? m.equipmentId;
  if (!id) return null;
  return (
    <Text
      as="span"
      className="action-source"
      style={size === undefined ? undefined : { width: size, height: size }}
      role="img"
      aria-label={sourceName(m)}
      title={sourceName(m)}
    >
      <EquipmentIcon equipment={item(id)} size={40} />
    </Text>
  );
}
