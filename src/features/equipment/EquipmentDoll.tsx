import { useState } from "react";
import {
  Circle,
  Gem,
  Footprints,
  Link2,
  Shield,
  Shirt,
  Sword,
} from "lucide-react";
import { SLOTS } from "../../game/equipment/catalog";
import { equipmentSlot, itemImage } from "../../game/equipment/item-art";
import type { Fighter, Item, Slot } from "../../game/types";
import "./equipment-doll.css";

export function ItemArtwork({
  equipment,
  size = 56,
  className = "",
}: {
  equipment: Item;
  size?: number;
  className?: string;
}) {
  if (equipment.kind === "jewelry")
    return (
      <svg
        className={`item-artwork jewel-art ${className}`}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        {equipment.slot === "ring" ? (
          <>
            <ellipse
              cx="32"
              cy="38"
              rx="18"
              ry="15"
              fill="none"
              stroke="#a58a50"
              strokeWidth="6"
            />
            <path
              d="M23 22 32 12 41 22 32 31Z"
              fill="#b7cbbb"
              stroke="#d5c184"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            <path
              d="M10 4Q32 42 54 4"
              fill="none"
              stroke="#a58a50"
              strokeWidth="2"
            />
            <path
              d="M32 20 46 37 32 56 18 37Z"
              fill="#6a8890"
              stroke="#d5c184"
              strokeWidth="3"
            />
            <path d="m32 26 7 11-7 12-7-12Z" fill="#c1b993" />
          </>
        )}
      </svg>
    );
  return (
    <img
      className={`item-artwork ${className}`}
      src={itemImage(equipment.id)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
}

const slots: Slot[] = ["weapon", "shield", "body", "feet", "ring", "amulet"];
const emptyIcons = {
  weapon: Sword,
  shield: Shield,
  body: Shirt,
  feet: Footprints,
  ring: Circle,
  amulet: Gem,
};
const labels = {
  weapon: "ПРАВАЯ",
  shield: "ЛЕВАЯ",
  body: "ТЕЛО",
  feet: "НОГИ",
  ring: "КОЛЬЦО",
  amulet: "АМУЛЕТ",
};

export function EquipmentDoll({
  fighter,
  onInspect,
}: {
  fighter: Fighter;
  onInspect: (equipment: Item) => void;
}) {
  const [selected, setSelected] = useState<Slot>("weapon");
  return (
    <section
      className="equipment-doll"
      aria-label={`Экипировка: ${fighter.name}`}
    >
      <div className="doll-stage">
        <img
          className="doll-silhouette"
          src="/ui/equipment-silhouette-neutral.png"
          alt="Силуэт человека с ячейками экипировки"
          width="1145"
          height="1374"
        />
        {slots.map((slot) => {
          const state = equipmentSlot(fighter, slot),
            EmptyIcon = state.blocked ? Link2 : emptyIcons[slot];
          const caption = state.blocked
            ? `Занята: ${state.occupiedBy!.name}, две руки`
            : state.unarmed
              ? "Кулак, без оружия"
              : (state.equipment?.name ?? "Пусто");
          return (
            <button
              key={slot}
              type="button"
              className={`doll-slot slot-${slot} ${state.equipment ? "occupied" : "empty"} ${state.blocked ? "blocked" : ""} ${selected === slot ? "inspected" : ""}`}
              onClick={() => {
                setSelected(slot);
                const equipment = state.equipment ?? state.occupiedBy;
                if (equipment) onInspect(equipment);
              }}
              aria-label={`${SLOTS[slot]}: ${caption}`}
              aria-pressed={selected === slot}
              aria-haspopup={
                state.equipment || state.occupiedBy ? "dialog" : undefined
              }
              title={`${SLOTS[slot]}: ${caption}`}
            >
              <span className="doll-slot-label">{labels[slot]}</span>
              {state.equipment ? (
                <ItemArtwork equipment={state.equipment} />
              ) : (
                <EmptyIcon size={23} strokeWidth={1.2} />
              )}
              {state.equipment?.hands === 2 && (
                <span className="hands-badge">2Р</span>
              )}
              {state.blocked && <span className="blocked-label">ЗАНЯТА</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
