import React from "react";

import { STATS, DAMAGE } from "../../game/equipment/catalog";

import { type Fighter, type Item } from "../../game/types";

export function ItemDetails({
  equipment,
  fighter,
}: {
  equipment: Item;
  fighter: Fighter;
}) {
  return (
    <>
      <p className="item-description">{equipment.description}</p>
      <div className="item-properties">
        {equipment.damage && (
          <span>
            Урон{" "}
            {equipment.damage
              .map(
                (d) =>
                  `${Math.ceil(d.base + d.scale * fighter.stats[d.stat])} · ${DAMAGE[d.type].toLowerCase()}`,
              )
              .join(" + ")}
          </span>
        )}
        {equipment.hands && (
          <span>{equipment.hands === 2 ? "Две руки" : "Одна рука"}</span>
        )}
        {equipment.kind !== "shield" &&
          equipment.defense &&
          Object.entries(equipment.defense).map(([type, value]) => (
            <span key={type}>
              {DAMAGE[type as keyof typeof DAMAGE]} −{value}
            </span>
          ))}
        {equipment.kind !== "shield" &&
          equipment.resistance &&
          Object.entries(equipment.resistance).map(([type, value]) => (
            <span key={type}>
              {DAMAGE[type as keyof typeof DAMAGE]} −{Math.round(value * 100)}%
            </span>
          ))}
      </div>
      <div className="requirements">
        Требования:{" "}
        {Object.entries(equipment.requirements).map(([key, val]) => (
          <span
            className={
              fighter.stats[key as keyof typeof STATS] < val ? "unmet" : ""
            }
            key={key}
          >
            <span className="stat-name">
              {STATS[key as keyof typeof STATS]}
            </span>{" "}
            {val}{" "}
            <small>(у вас {fighter.stats[key as keyof typeof STATS]})</small>
          </span>
        ))}
        {!Object.keys(equipment.requirements).length && "нет"}
      </div>
    </>
  );
}
