import "@/shared/ui/EquipmentIcon/EquipmentIcon.css";
import { Sword } from "lucide-react";
import { itemImage } from "@/game/equipment/item-art";
import type { Item } from "@/game/types";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { type ItemIconProps } from "@/shared/ui/ItemIcon/model";
export function EquipmentIcon({
  equipment,
  className = "",
  ...props
}: Omit<ItemIconProps, "children"> & { equipment?: Item }) {
  return (
    <ItemIcon {...props} className={`equipment-icon ${className}`}>
      {equipment ? (
        <img
          src={itemImage(equipment.id)}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Sword aria-hidden="true" strokeWidth={1.5} />
      )}
    </ItemIcon>
  );
}
