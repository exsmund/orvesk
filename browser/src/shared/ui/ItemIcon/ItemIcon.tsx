import { Text } from "@/shared/ui/Text";
import "@/shared/ui/ItemIcon/ItemIcon.css";
import type { CSSProperties } from "react";

import { ItemIconProps } from "@/shared/ui/ItemIcon/model";
/** Shared square surface; the caller owns labels and interaction. */
export function ItemIcon({
  children,
  size = 56,
  className = "",
  framed = false,
}: ItemIconProps) {
  return (
    <Text
      as="span"
      className={`item-icon ${framed ? "item-icon--framed" : ""} ${className}`}
      style={
        {
          "--item-icon-size": typeof size === "number" ? `${size}px` : size,
        } as CSSProperties
      }
    >
      {children}
    </Text>
  );
}
