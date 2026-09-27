import { portraitFacing } from "@/game/characters/portraits";
import { Text } from "@/shared/ui/Text";
import "@/shared/ui/CharacterPortrait/CharacterPortrait.css";

import { CharacterPortraitProps } from "@/shared/ui/CharacterPortrait/model";
/** Shared portrait artwork, frame, aspect ratio and shadow for every fighter. */
export function CharacterPortrait({
  src,
  dead = false,
  side = "player",
  size = "large",
  alt = "",
  className = "",
  label,
  title,
  onClick,
  loading,
}: CharacterPortraitProps) {
  const image = (
    <>
      <img
        className="identity-portrait"
        data-facing={portraitFacing(src)}
        src={src}
        alt={alt}
        width="240"
        height="360"
        loading={loading}
        draggable={false}
      />
      {dead && (
        <img
          className="character-portrait__death"
          src={
            side === "enemy"
              ? "/ui/portrait-death-skull-enemy-v1.png"
              : "/ui/portrait-death-skull-v1.png"
          }
          alt=""
          aria-hidden="true"
          width="1024"
          height="1536"
          draggable={false}
        />
      )}
    </>
  );
  const classes = `character-portrait character-portrait--${size} ${className}`;
  return onClick ? (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={`${label ?? alt}${dead ? " · Погиб" : ""}`}
      aria-haspopup="dialog"
      title={title}
    >
      {image}
    </button>
  ) : (
    <Text
      as="span"
      className={classes}
      title={title}
      aria-label={dead ? `${alt || label || "Персонаж"} · Погиб` : undefined}
    >
      {image}
    </Text>
  );
}
