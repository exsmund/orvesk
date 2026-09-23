import React from "react";

import { Sword } from "lucide-react";

import { type Item } from "../../game/types";

import { ItemArtwork } from "./EquipmentDoll";

export function ItemIcon({
  equipment,
  size = 40,
}: {
  equipment?: Item;
  size?: number;
}) {
  return equipment ? (
    <ItemArtwork equipment={equipment} size={size} />
  ) : (
    <Sword size={size} strokeWidth={1.5} />
  );
}
